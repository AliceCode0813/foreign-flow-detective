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
    (
        "rankings_snapshot_daily",
        "rankings_snapshot_daily_trade_date_market_period_direction_rank_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS rankings_snapshot_daily_trade_date_market_period_direction_rank_key "
        "ON rankings_snapshot_daily (trade_date, market, period, direction, rank)",
    ),
    (
        "investor_trading_daily",
        "investor_trading_daily_stock_code_trade_date_investor_type_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS investor_trading_daily_stock_code_trade_date_investor_type_key "
        "ON investor_trading_daily (stock_code, trade_date, investor_type)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_stock_code_trade_date_investor_type_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS investor_rankings_daily_stock_code_trade_date_investor_type_key "
        "ON investor_rankings_daily (stock_code, trade_date, investor_type)",
    ),
    (
        "investor_rankings_snapshot_daily",
        "investor_rankings_snapshot_daily_unique_key",
        "CREATE UNIQUE INDEX IF NOT EXISTS investor_rankings_snapshot_daily_unique_key "
        "ON investor_rankings_snapshot_daily (trade_date, market, period, direction, investor_type, rank)",
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

INVESTOR_TRADING_DDL = """
CREATE TABLE IF NOT EXISTS investor_trading_daily (
  id VARCHAR(25) PRIMARY KEY,
  stock_code VARCHAR(6) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  trade_date VARCHAR(10) NOT NULL,
  investor_type VARCHAR(20) NOT NULL,
  net_value BIGINT NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'pykrx',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stock_code, trade_date, investor_type)
)
"""

INVESTOR_RANKINGS_DDL = """
CREATE TABLE IF NOT EXISTS investor_rankings_daily (
  id VARCHAR(25) PRIMARY KEY,
  stock_code VARCHAR(6) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  trade_date VARCHAR(10) NOT NULL,
  investor_type VARCHAR(20) NOT NULL,
  change_1d BIGINT NOT NULL DEFAULT 0,
  change_5d BIGINT NOT NULL DEFAULT 0,
  change_20d BIGINT NOT NULL DEFAULT 0,
  change_60d BIGINT NOT NULL DEFAULT 0,
  consecutive_up_days INTEGER NOT NULL DEFAULT 0,
  consecutive_down_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stock_code, trade_date, investor_type)
)
"""

INVESTOR_SNAPSHOT_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS investor_rankings_snapshot_daily (
  id VARCHAR(25) PRIMARY KEY,
  trade_date VARCHAR(10) NOT NULL,
  market VARCHAR(20) NOT NULL,
  period VARCHAR(4) NOT NULL,
  direction VARCHAR(6) NOT NULL,
  investor_type VARCHAR(20) NOT NULL,
  rank INTEGER NOT NULL,
  stock_code VARCHAR(6) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  change BIGINT NOT NULL,
  current_value BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trade_date, market, period, direction, investor_type, rank)
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
    (
        "investor_trading_daily",
        "investor_trading_daily_stock_code_trade_date_idx",
        "CREATE INDEX IF NOT EXISTS investor_trading_daily_stock_code_trade_date_idx "
        "ON investor_trading_daily (stock_code, trade_date)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_trade_date_investor_type_change_1d_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_daily_trade_date_investor_type_change_1d_idx "
        "ON investor_rankings_daily (trade_date, investor_type, change_1d DESC)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_trade_date_investor_type_change_5d_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_daily_trade_date_investor_type_change_5d_idx "
        "ON investor_rankings_daily (trade_date, investor_type, change_5d DESC)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_trade_date_investor_type_change_20d_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_daily_trade_date_investor_type_change_20d_idx "
        "ON investor_rankings_daily (trade_date, investor_type, change_20d DESC)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_trade_date_investor_type_change_60d_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_daily_trade_date_investor_type_change_60d_idx "
        "ON investor_rankings_daily (trade_date, investor_type, change_60d DESC)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_trade_date_investor_type_consecutive_up_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_daily_trade_date_investor_type_consecutive_up_idx "
        "ON investor_rankings_daily (trade_date, investor_type, consecutive_up_days DESC)",
    ),
    (
        "investor_rankings_daily",
        "investor_rankings_daily_trade_date_investor_type_consecutive_down_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_daily_trade_date_investor_type_consecutive_down_idx "
        "ON investor_rankings_daily (trade_date, investor_type, consecutive_down_days DESC)",
    ),
    (
        "investor_rankings_snapshot_daily",
        "investor_rankings_snapshot_daily_lookup_idx",
        "CREATE INDEX IF NOT EXISTS investor_rankings_snapshot_daily_lookup_idx "
        "ON investor_rankings_snapshot_daily (trade_date, market, period, direction, investor_type)",
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

    for ddl in COLUMN_ALTERS:
        print(f"[ensure_schema] {ddl[:60]}...")
        cur.execute(ddl)

    print("[ensure_schema] rankings_snapshot_daily table...")
    cur.execute(SNAPSHOT_TABLE_DDL)
    print("[ensure_schema] investor_trading_daily table...")
    cur.execute(INVESTOR_TRADING_DDL)
    print("[ensure_schema] investor_rankings_daily table...")
    cur.execute(INVESTOR_RANKINGS_DDL)
    print("[ensure_schema] investor_rankings_snapshot_daily table...")
    cur.execute(INVESTOR_SNAPSHOT_TABLE_DDL)

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
