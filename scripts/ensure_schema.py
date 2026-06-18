"""Supabase/PostgreSQL에 Prisma @@unique 제약이 없으면 추가."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from supabase_env import get_supabase_url, read_env  # noqa: E402

UNIQUE_INDEXES: list[tuple[str, str, str]] = [
    (
        "foreign_ownership_daily",
        "foreign_ownership_daily_stock_code_trade_date_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS foreign_ownership_daily_stock_code_trade_date_key "
        "ON foreign_ownership_daily (stock_code, trade_date)",
    ),
    (
        "rankings_daily",
        "rankings_daily_stock_code_trade_date_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS rankings_daily_stock_code_trade_date_key "
        "ON rankings_daily (stock_code, trade_date)",
    ),
    (
        "stock_market_daily",
        "stock_market_daily_stock_code_trade_date_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS stock_market_daily_stock_code_trade_date_key "
        "ON stock_market_daily (stock_code, trade_date)",
    ),
    (
        "stock_fundamental_daily",
        "stock_fundamental_daily_stock_code_trade_date_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS stock_fundamental_daily_stock_code_trade_date_key "
        "ON stock_fundamental_daily (stock_code, trade_date)",
    ),
]


def get_url() -> str:
    env = read_env()
    for key in ("DATABASE_URL", "LOCAL_DATABASE_URL"):
        url = os.environ.get(key) or env.get(key, "").strip()
        if url:
            return url
    return get_supabase_url()


def main() -> int:
    url = get_url()
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()

    for table, index_name, ddl in UNIQUE_INDEXES:
        cur.execute(
            """
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = %s AND indexname = %s
            """,
            (table, index_name),
        )
        if cur.fetchone():
            print(f"[ensure_schema] OK {index_name}")
            continue
        print(f"[ensure_schema] creating {index_name}...")
        cur.execute(ddl)

    cur.close()
    conn.close()
    print("[ensure_schema] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
