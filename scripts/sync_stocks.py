"""
상장 종목 마스터만 빠르게 동기화 (지분 데이터 없음)

전 종목 검색·즐겨찾기 추가를 위해 stocks 테이블만 채웁니다.
소요: 약 1~2분 (지분 수집 ingest:all 은 1~3시간)

사용:
  py scripts/sync_stocks.py
  py scripts/sync_stocks.py --market KOSPI
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]


def load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file()


def get_connection():
    url = os.environ.get("LOCAL_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("LOCAL_DATABASE_URL 또는 DATABASE_URL 필요")
    return psycopg2.connect(url)


def load_universe(market: str, ref_date: str) -> list[tuple[str, str, str]]:
    from pykrx import stock

    markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]
    universe: list[tuple[str, str, str]] = []

    for m in markets:
        tickers = stock.get_market_ticker_list(ref_date, market=m)
        print(f"[INFO] {m} {len(tickers)}종목")
        for code in tickers:
            name = stock.get_market_ticker_name(code)
            universe.append((code, name, m))

    return universe


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--market", choices=["KOSPI", "KOSDAQ", "ALL"], default="ALL")
    args = parser.parse_args()

    ref_date = datetime.now().strftime("%Y%m%d")
    universe = load_universe(args.market, ref_date)
    print(f"\n[START] {len(universe)}종목 마스터 동기화\n")

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                for code, name, market in universe:
                    cur.execute(
                        """
                        INSERT INTO stocks (code, name, market, sector, created_at)
                        VALUES (%s, %s, %s, NULL, NOW())
                        ON CONFLICT (code) DO UPDATE SET
                          name = EXCLUDED.name,
                          market = EXCLUDED.market
                        """,
                        (code, name, market),
                    )
        print(f"[DONE] {len(universe)}종목 stocks 테이블 반영 완료")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
