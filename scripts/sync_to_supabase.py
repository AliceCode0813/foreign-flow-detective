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

from supabase_env import build_bulk_sync_url, read_env  # noqa: E402

BATCH = 2_000

TABLES: list[dict] = [
    {
        "name": "stocks",
        "conflict": ["code"],
        "update": ["name", "market", "sector", "overview", "dart_corp_code"],
    },
    {
        "name": "foreign_ownership_daily",
        "conflict": ["stock_code", "trade_date"],
        "update": ["foreign_ratio_pct", "foreign_shares", "listed_shares", "source"],
    },
    {
        "name": "rankings_daily",
        "conflict": ["stock_code", "trade_date"],
        "update": [
            "change_1d",
            "change_5d",
            "change_20d",
            "change_60d",
            "foreign_ratio_percentile",
            "consecutive_up_days",
            "consecutive_down_days",
        ],
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
    {
        "name": "rankings_snapshot_daily",
        "conflict": ["trade_date", "market", "period", "direction", "rank"],
        "update": ["stock_code", "change", "current_ratio", "foreign_ratio_percentile"],
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


def find_codes_with_table_gap(local, remote, table: str) -> list[str]:
    """로컬 행 수가 Supabase보다 많은 종목 코드."""
    with local.cursor() as lc, remote.cursor() as rc:
        lc.execute(
            sql.SQL("SELECT stock_code, COUNT(*) FROM {} GROUP BY stock_code").format(
                sql.Identifier(table)
            )
        )
        local_counts = dict(lc.fetchall())
        rc.execute(
            sql.SQL("SELECT stock_code, COUNT(*) FROM {} GROUP BY stock_code").format(
                sql.Identifier(table)
            )
        )
        remote_counts = dict(rc.fetchall())

    return sorted(
        code for code, count in local_counts.items() if count > remote_counts.get(code, 0)
    )


def upsert_table_for_codes(src, dst, spec: dict, codes: list[str] | None) -> int:
    table = spec["name"]
    conflict = spec["conflict"]
    update_cols = spec["update"]

    with src.cursor() as sc:
        if codes and table == "stocks":
            sc.execute(
                sql.SQL("SELECT * FROM {} WHERE code = ANY(%s) ORDER BY code").format(
                    sql.Identifier(table)
                ),
                (codes,),
            )
        elif codes and table != "stocks":
            sc.execute(
                sql.SQL("SELECT * FROM {} WHERE stock_code = ANY(%s) ORDER BY 1").format(
                    sql.Identifier(table),
                ),
                (codes,),
            )
        else:
            sc.execute(sql.SQL("SELECT * FROM {} ORDER BY 1").format(sql.Identifier(table)))

        cols = [d[0] for d in sc.description]
        rows = sc.fetchall()

    if not rows:
        return 0

    if codes and table != "stocks":
        with dst.cursor() as dc:
            dc.execute(
                sql.SQL("DELETE FROM {} WHERE stock_code = ANY(%s)").format(
                    sql.Identifier(table)
                ),
                (codes,),
            )
        dst.commit()
    elif codes and table == "stocks":
        with dst.cursor() as dc:
            dc.execute(
                sql.SQL("DELETE FROM {} WHERE code = ANY(%s)").format(sql.Identifier(table)),
                (codes,),
            )
        dst.commit()

    col_list = sql.SQL(", ").join(sql.Identifier(c) for c in cols)
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
                insert_head.as_string(dst),
                chunk,
                page_size=BATCH,
            )
            total += len(chunk)
            dst.commit()
            print(f"    {table}: {total:,}/{len(rows):,}", flush=True)

    return total


def replace_table_full(src, dst, table: str) -> int:
    """UNIQUE 제약 없는 테이블 — 전량 교체."""
    with src.cursor() as sc:
        sc.execute(sql.SQL("SELECT * FROM {} ORDER BY 1").format(sql.Identifier(table)))
        cols = [d[0] for d in sc.description]
        rows = sc.fetchall()

    if not rows:
        return 0

    with dst.cursor() as dc:
        dc.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table)))
    dst.commit()

    col_list = sql.SQL(", ").join(sql.Identifier(c) for c in cols)
    insert_head = sql.SQL("INSERT INTO {} ({}) VALUES %s").format(
        sql.Identifier(table),
        col_list,
    )

    total = 0
    with dst.cursor() as dc:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            execute_values(dc, insert_head.as_string(dst), chunk, page_size=BATCH)
            total += len(chunk)
            dst.commit()
            print(f"    {table}: {total:,}/{len(rows):,}", flush=True)

    return total


def upsert_table_full(src, dst, spec: dict) -> int:
    """전체 테이블 UPSERT (--full)."""
    table = spec["name"]
    if table in ("stock_market_daily", "stock_fundamental_daily"):
        return replace_table_full(src, dst, table)

    conflict = spec["conflict"]
    update_cols = spec["update"]

    with src.cursor() as sc:
        sc.execute(sql.SQL("SELECT * FROM {} ORDER BY 1").format(sql.Identifier(table)))
        cols = [d[0] for d in sc.description]
        rows = sc.fetchall()

    if not rows:
        return 0

    col_list = sql.SQL(", ").join(sql.Identifier(c) for c in cols)
    conflict_sql = sql.SQL(", ").join(sql.Identifier(c) for c in conflict)

    if update_cols:
        set_sql = sql.SQL(", ").join(
            sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(c), sql.Identifier(c))
            for c in update_cols
        )
        on_conflict = sql.SQL(" ON CONFLICT ({}) DO UPDATE SET {}").format(
            conflict_sql, set_sql
        )
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

    remote_url = build_bulk_sync_url(env["SUPABASE_DB_PASSWORD"])
    src = connect(local_url)
    dst = connect(remote_url)

    codes: list[str] | None = None
    repair_tables: set[str] | None = None
    if args.only_new_stocks and not args.full:
        with src.cursor() as cur:
            cur.execute("SELECT MAX(trade_date) FROM foreign_ownership_daily")
            latest = cur.fetchone()[0]
        codes = find_codes_to_sync(src, dst, latest)
        if codes:
            print(f"[sync] 신규/누락 종목 {len(codes)}개 → {latest}", flush=True)
        else:
            codes = find_codes_with_table_gap(src, dst, "stock_market_daily")
            if codes:
                repair_tables = {"stock_market_daily", "stock_fundamental_daily"}
                print(f"[sync] 시세 gap 보완 {len(codes)}종목", flush=True)
            else:
                print("[sync] 동기화할 종목 없음", flush=True)
                return 0

    print("[sync] UPSERT 시작", flush=True)
    total = 0
    try:
        for spec in TABLES:
            if repair_tables and spec["name"] not in repair_tables:
                continue
            if args.only_new_stocks and not args.full and not repair_tables and spec["name"] not in {
                "stocks",
                "foreign_ownership_daily",
                "rankings_daily",
                "stock_market_daily",
                "stock_fundamental_daily",
            }:
                continue
            print(f"  {spec['name']}...", flush=True)
            if args.full:
                n = upsert_table_full(src, dst, spec)
            else:
                n = upsert_table_for_codes(src, dst, spec, codes)
            print(f"  {spec['name']}: {n:,} rows", flush=True)
            total += n
    finally:
        src.close()
        dst.close()

    print(f"[sync] 완료 - {total:,} rows", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
