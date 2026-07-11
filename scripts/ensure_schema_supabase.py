"""Supabase에만 ensure_schema 적용 (LOCAL_DATABASE_URL 무시)."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ensure_schema import (  # noqa: E402
    COLUMN_ALTERS,
    INVESTOR_RANKINGS_DDL,
    INVESTOR_SNAPSHOT_TABLE_DDL,
    INVESTOR_TRADING_DDL,
    SNAPSHOT_TABLE_DDL,
    STREAK_INDEXES,
    UNIQUE_INDEXES,
)
from supabase_env import get_supabase_url  # noqa: E402


def main() -> int:
    url = get_supabase_url()
    host = urlparse(url)._replace(netloc=urlparse(url).hostname or "").geturl()
    # print host only
    parsed = urlparse(url)
    print(f"[supabase_schema] target: {parsed.hostname}:{parsed.port}{parsed.path}")

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

    for table, index_name, ddl in UNIQUE_INDEXES + STREAK_INDEXES:
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

    cur.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE 'investor%'
        ORDER BY 1
        """
    )
    print("[supabase_schema] investor tables:", [r[0] for r in cur.fetchall()])

    cur.close()
    conn.close()
    print("[ensure_schema] done (supabase)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
