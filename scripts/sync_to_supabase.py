"""
로컬 PostgreSQL → Supabase 증분 동기화 (UPSERT).

신규 ingest 후 변경분만 반영할 때 사용.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from supabase_env import get_supabase_url, read_env  # noqa: E402

BATCH = 2_000

TABLES: list[dict] = [
    {
        "name": "stocks",
        "conflict": ["code"],
        "update": ["name", "market", "sector"],
    },
    {
        "name": "foreign_ownership_daily",
        "conflict": ["stock_code", "trade_date"],
        "update": ["foreign_ratio_pct", "foreign_shares", "listed_shares", "source"],
    },
    {
        "name": "rankings_daily",
        "conflict": ["stock_code", "trade_date"],
        "update": ["change_1d", "change_10d", "change_30d", "change_60d"],
    },
    {
        "name": "stock_market_daily",
        "conflict": ["stock_code", "trade_date"],
        "update": [
            "open_price",
            "high_price",
            "low_price",
            "close_price",
            "volume",
            "change_pct",
        ],
    },
    {
        "name": "stock_fundamental_daily",
        "conflict": ["stock_code", "trade_date"],
        "update": [
            "market_cap",
            "listed_shares",
            "trading_value",
            "per",
            "pbr",
            "eps",
            "bps",
            "div_yield",
            "dps",
        ],
    },
    {
        "name": "alerts",
        "conflict": ["id"],
        "update": ["alert_type", "message", "trade_date", "severity"],
    },
    {
        "name": "watchlist",
        "conflict": ["stock_code"],
        "update": [],
    },
]


def connect(url: str):
    conn = psycopg2.connect(url)
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = 0")
    conn.commit()
    return conn


def find_codes_to_sync(local, remote, latest: str) -> list[str]:
    """최신 trade_date 기준 Supabase에 없는 종목 코드."""
    with local.cursor() as lc, remote.cursor() as rc:
        lc.execute(
            """
            SELECT DISTINCT stock_code FROM foreign_ownership_daily
            WHERE trade_date = %s ORDER BY stock_code
            """,
            (latest,),
        )
        local_codes = {r[0] for r in lc.fetchall()}
        rc.execute(
            """
            SELECT DISTINCT stock_code FROM foreign_ownership_daily
            WHERE trade_date = %s
            """,
            (latest,),
        )
        remote_codes = {r[0] for r in rc.fetchall()}
    return sorted(local_codes - remote_codes)


def upsert_table_for_codes(src, dst, spec: dict, codes: list[str] | None) -> int:
    table = spec["name"]
    conflict = spec["conflict"]
    update_cols = spec["update"]

    with src.cursor() as sc:
        if codes and table != "stocks":
            code_col = "code" if table == "stocks" else "stock_code"
            sc.execute(
                sql.SQL("SELECT * FROM {} WHERE {} = ANY(%s) ORDER BY 1").format(
                    sql.Identifier(table),
                    sql.Identifier(code_col),
                ),
                (codes,),
            )
        elif codes and table == "stocks":
            sc.execute(
                sql.SQL("SELECT * FROM {} WHERE code = ANY(%s) ORDER BY code").format(
                    sql.Identifier(table)
                ),
                (codes,),
            )
        else:
            sc.execute(sql.SQL("SELECT * FROM {} ORDER BY 1").format(sql.Identifier(table)))

        cols = [d[0] for d in sc.description]
        rows = sc.fetchall()

    if not rows:
        return 0

    col_list = sql.SQL(", ").join(sql.Identifier(c) for c in cols)
    conflict_sql = sql.SQL(", ").join(sql.Identifier(c) for c in conflict)
    placeholders = sql.SQL(", ").join(sql.Placeholder() * len(cols))

    if update_cols:
        set_sql = sql.SQL(", ").join(
            sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(c), sql.Identifier(c))
            for c in update_cols
        )
        on_conflict = sql.SQL(
            " ON CONFLICT ({}) DO UPDATE SET {}"
        ).format(conflict_sql, set_sql)
    else:
        on_conflict = sql.SQL(" ON CONFLICT ({}) DO NOTHING").format(conflict_sql)

    insert_head = sql.SQL("INSERT INTO {} ({}) VALUES %s").format(
        sql.Identifier(table),
        col_list,
    )

    total = 0
    with dst.cursor() as dc:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            execute_values(
                dc,
                insert_head.as_string(dst) + on_conflict.as_string(dst),
                chunk,
                page_size=BATCH,
            )
            total += len(chunk)
            dst.commit()
            print(f"    {table}: {total:,}/{len(rows):,}", flush=True)

    return total


def main() -> int:
    parser = argparse.ArgumentParser(description="로컬 → Supabase UPSERT 동기화")
    parser.add_argument(
        "--only-new-stocks",
        action="store_true",
        help="Supabase에 없는 종목 코드만 동기화 (ingest 후 권장)",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="전체 테이블 UPSERT (느림)",
    )
    args = parser.parse_args()

    env = read_env()
    local_url = env.get("LOCAL_DATABASE_URL")
    if not local_url:
        raise RuntimeError("LOCAL_DATABASE_URL 필요")

    remote_url = get_supabase_url()
    src = connect(local_url)
    dst = connect(remote_url)

    codes: list[str] | None = None
    if args.only_new_stocks and not args.full:
        with src.cursor() as cur:
            cur.execute("SELECT MAX(trade_date) FROM foreign_ownership_daily")
            latest = cur.fetchone()[0]
        codes = find_codes_to_sync(src, dst, latest)
        print(f"[sync] 신규/누락 종목 {len(codes)}개 → {latest}", flush=True)
        if not codes:
            print("[sync] 동기화할 종목 없음", flush=True)
            return 0

    print("[sync] UPSERT 시작", flush=True)
    total = 0
    try:
        for spec in TABLES:
            if args.only_new_stocks and not args.full and spec["name"] not in {
                "stocks",
                "foreign_ownership_daily",
                "rankings_daily",
                "stock_market_daily",
                "stock_fundamental_daily",
            }:
                continue
            print(f"  {spec['name']}...", flush=True)
            n = upsert_table_for_codes(src, dst, spec, None if args.full else codes)
            print(f"  {spec['name']}: {n:,} rows", flush=True)
            total += n
    finally:
        src.close()
        dst.close()

    print(f"[sync] 완료 — {total:,} rows", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
