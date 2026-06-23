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


COLUMN_ALTERS: list[str] = [
    "ALTER TABLE rankings_daily ADD COLUMN IF NOT EXISTS consecutive_up_days INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE rankings_daily ADD COLUMN IF NOT EXISTS consecutive_down_days INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE rankings_daily ADD COLUMN IF NOT EXISTS change_5d DOUBLE PRECISION NOT NULL DEFAULT 0",
    "ALTER TABLE rankings_daily ADD COLUMN IF NOT EXISTS change_20d DOUBLE PRECISION NOT NULL DEFAULT 0",
    "ALTER TABLE rankings_daily ADD COLUMN IF NOT EXISTS foreign_ratio_percentile DOUBLE PRECISION",
    "ALTER TABLE stocks ADD COLUMN IF NOT EXISTS overview TEXT",
    "ALTER TABLE stocks ADD COLUMN IF NOT EXISTS dart_corp_code VARCHAR(8)",
]

SNAPSHOT_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS rankings_snapshot_daily (
  id VARCHAR(25) PRIMARY KEY,
  trade_date VARCHAR(10) NOT NULL,
  market VARCHAR(20) NOT NULL,
  period VARCHAR(4) NOT NULL,
  direction VARCHAR(6) NOT NULL,
  rank INTEGER NOT NULL,
  stock_code VARCHAR(6) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  change DOUBLE PRECISION NOT NULL,
  current_ratio DOUBLE PRECISION NOT NULL,
  foreign_ratio_percentile DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trade_date, market, period, direction, rank)
)
"""

STREAK_INDEXES: list[tuple[str, str, str]] = [
    (
        "rankings_daily",
        "rankings_daily_trade_date_consecutive_up_days_idx",
        "CREATE INDEX IF NOT EXISTS rankings_daily_trade_date_consecutive_up_days_idx "
        "ON rankings_daily (trade_date, consecutive_up_days DESC)",
    ),
    (
        "rankings_daily",
        "rankings_daily_trade_date_consecutive_down_days_idx",
        "CREATE INDEX IF NOT EXISTS rankings_daily_trade_date_consecutive_down_days_idx "
        "ON rankings_daily (trade_date, consecutive_down_days DESC)",
    ),
    (
        "rankings_daily",
        "rankings_daily_trade_date_change_5d_idx",
        "CREATE INDEX IF NOT EXISTS rankings_daily_trade_date_change_5d_idx "
        "ON rankings_daily (trade_date, change_5d DESC)",
    ),
    (
        "rankings_daily",
        "rankings_daily_trade_date_change_20d_idx",
        "CREATE INDEX IF NOT EXISTS rankings_daily_trade_date_change_20d_idx "
        "ON rankings_daily (trade_date, change_20d DESC)",
    ),
    (
        "rankings_snapshot_daily",
        "rankings_snapshot_daily_lookup_idx",
        "CREATE INDEX IF NOT EXISTS rankings_snapshot_daily_lookup_idx "
        "ON rankings_snapshot_daily (trade_date, market, period, direction)",
    ),
]


def get_url() -> str:
    env = read_env()
    # ingest.py 와 동일: LOCAL_DATABASE_URL 우선 (로컬 개발)
    for key in ("LOCAL_DATABASE_URL", "DATABASE_URL"):
        url = (os.environ.get(key) or env.get(key, "")).strip()
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

    for ddl in COLUMN_ALTERS:
        print(f"[ensure_schema] {ddl[:60]}...")
        cur.execute(ddl)

    print("[ensure_schema] rankings_snapshot_daily table...")
    cur.execute(SNAPSHOT_TABLE_DDL)

    for table, index_name, ddl in STREAK_INDEXES:
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
