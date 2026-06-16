"""
로컬 PostgreSQL → Supabase 데이터 이관 (COPY bulk).
"""

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2 import sql

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from supabase_env import get_supabase_url, read_env, write_database_url  # noqa: E402

# 부모 → 자식 순으로 적재
TABLES = [
    "stocks",
    "foreign_ownership_daily",
    "rankings_daily",
    "stock_market_daily",
    "stock_fundamental_daily",
    "alerts",
    "watchlist",
]

BATCH_SIZE = 20_000


def connect(url: str):
    conn = psycopg2.connect(url)
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = 0")
        cur.execute("SET lock_timeout = 0")
    conn.commit()
    return conn


def clear_all(dst) -> None:
    with dst.cursor() as dc:
        dc.execute("SET session_replication_role = replica")
        for table in reversed(TABLES):
            dc.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table)))
        dc.execute("SET session_replication_role = DEFAULT")
    dst.commit()
    print("[migrate] Supabase 기존 데이터 비움", flush=True)


def copy_table(src, dst, table: str) -> int:
    with src.cursor() as sc:
        sc.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table)))
        total = sc.fetchone()[0]
        if total == 0:
            return 0

    copied = 0
    offset = 0
    cols: list[str] | None = None
    col_sql = None

    while offset < total:
        with src.cursor() as sc:
            sc.execute(
                sql.SQL("SELECT * FROM {} ORDER BY 1 LIMIT %s OFFSET %s").format(
                    sql.Identifier(table)
                ),
                (BATCH_SIZE, offset),
            )
            rows = sc.fetchall()
            if not rows:
                break
            if cols is None:
                cols = [desc[0] for desc in sc.description]
                col_sql = sql.SQL(", ").join(sql.Identifier(c) for c in cols)

        buf = io.StringIO()
        for row in rows:
            parts = []
            for val in row:
                if val is None:
                    parts.append("\\N")
                else:
                    text = str(val).replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")
                    parts.append(text)
            buf.write("\t".join(parts) + "\n")

        buf.seek(0)
        with dst.cursor() as dc:
            dc.copy_expert(
                sql.SQL("COPY {} ({}) FROM STDIN").format(
                    sql.Identifier(table),
                    col_sql,
                ).as_string(dst),
                buf,
            )
        dst.commit()

        copied += len(rows)
        offset += len(rows)
        print(f"    {table}: {copied:,}/{total:,}", flush=True)

    return copied


def main() -> int:
    local_url = os.environ.get("LOCAL_DATABASE_URL") or read_env().get("LOCAL_DATABASE_URL")
    if not local_url:
        raise RuntimeError("LOCAL_DATABASE_URL 환경변수 필요")

    supabase_url = get_supabase_url()
    write_database_url(supabase_url)
    os.environ["DATABASE_URL"] = supabase_url

    print("[migrate] 로컬 → Supabase 이관 시작", flush=True)
    print(f"[migrate] 대상: {supabase_url.split('@')[-1]}", flush=True)

    src = connect(local_url)
    dst = connect(supabase_url)
    print("[migrate] Supabase 적재 시작 (기존 데이터 유지)", flush=True)

    total = 0
    try:
        for table in TABLES:
            print(f"  {table}...", flush=True)
            try:
                n = copy_table(src, dst, table)
                print(f"  {table}: {n:,} rows 완료", flush=True)
                total += n
            except psycopg2.Error as exc:
                dst.rollback()
                print(f"  {table}: SKIP ({exc.pgerror or exc})", flush=True)
    finally:
        src.close()
        dst.close()

    print(f"[migrate] 완료 — 총 {total:,} rows", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
