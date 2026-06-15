"""기존 종목 시세 OHLC·투자지표 백필 (pykrx)"""

from __future__ import annotations

import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ingest import (  # noqa: E402
    fetch_fundamental_rows,
    fetch_market_rows,
    get_connection,
    load_env_file,
    upsert_fundamentals,
    upsert_market,
)

load_env_file()


def main():
    days = 120
    end = datetime.now()
    start = end - timedelta(days=days + 30)
    start_str = start.strftime("%Y%m%d")
    end_str = end.strftime("%Y%m%d")

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT DISTINCT stock_code FROM stock_market_daily")
                codes = [r[0] for r in cur.fetchall()]
                print(f"[START] {len(codes)}종목 OHLC·투자지표 백필", flush=True)

                for i, code in enumerate(codes, 1):
                    try:
                        mkt_rows = fetch_market_rows(code, start_str, end_str)
                        fund_rows = fetch_fundamental_rows(code, start_str, end_str)
                        upsert_market(cur, code, mkt_rows)
                        upsert_fundamentals(cur, code, fund_rows)
                        conn.commit()
                        if i % 20 == 0 or i == len(codes):
                            print(f"[{i}/{len(codes)}] 완료", flush=True)
                    except Exception as exc:
                        conn.rollback()
                        print(f"[FAIL] {code}: {exc}", file=sys.stderr)
                    time.sleep(0.15)
        print("[DONE]", flush=True)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
