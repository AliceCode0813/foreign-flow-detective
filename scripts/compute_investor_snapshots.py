"""
investor_rankings_daily 기준 TOP10 스냅샷 사전 계산.

ingest 완료 후 또는 daily-update finalize에서 실행:
  py scripts/compute_investor_snapshots.py
  py scripts/compute_investor_snapshots.py --trade-date 2026-07-10
"""

from __future__ import annotations

import argparse
import os
import uuid
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]

PERIODS: list[tuple[str, str]] = [
    ("1d", "change_1d"),
    ("5d", "change_5d"),
    ("20d", "change_20d"),
    ("60d", "change_60d"),
]

MARKETS = ["ALL", "KOSPI", "KOSDAQ"]
INVESTOR_TYPES = ["INSTITUTION", "INDIVIDUAL", "FOREIGN"]
TOP_N = 10


def load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key.strip() and key.strip() not in os.environ:
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_env_file()


def get_connection():
    url = os.environ.get("LOCAL_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 필요")
    return psycopg2.connect(url)


def resolve_trade_date(cur, trade_date: str | None) -> str | None:
    if trade_date:
        return trade_date
    cur.execute(
        """
        SELECT trade_date FROM investor_rankings_daily
        WHERE investor_type = 'INSTITUTION'
        GROUP BY trade_date
        HAVING COUNT(*) >= 2500
        ORDER BY trade_date DESC
        LIMIT 1
        """
    )
    row = cur.fetchone()
    return row[0] if row else None


def market_filter_sql(market: str) -> tuple[str, tuple]:
    if market == "ALL":
        return "", ()
    return " AND s.market = %s", (market,)


def fetch_top_bottom(
    cur,
    trade_date: str,
    market: str,
    investor_type: str,
    change_col: str,
    limit: int,
) -> tuple[list[tuple], list[tuple]]:
    mfilter, mparams = market_filter_sql(market)
    base = f"""
        SELECT r.stock_code, r.{change_col}, t.net_value
        FROM investor_rankings_daily r
        JOIN stocks s ON s.code = r.stock_code
        JOIN investor_trading_daily t
          ON t.stock_code = r.stock_code
         AND t.trade_date = r.trade_date
         AND t.investor_type = r.investor_type
        WHERE r.trade_date = %s
          AND r.investor_type = %s{mfilter}
    """
    cur.execute(
        base + f" ORDER BY r.{change_col} DESC LIMIT %s",
        (trade_date, investor_type, *mparams, limit),
    )
    top = cur.fetchall()
    cur.execute(
        base + f" ORDER BY r.{change_col} ASC LIMIT %s",
        (trade_date, investor_type, *mparams, limit),
    )
    bottom = cur.fetchall()
    return top, bottom


def upsert_snapshots(
    cur,
    trade_date: str,
    market: str,
    period: str,
    direction: str,
    investor_type: str,
    rows: list[tuple],
) -> None:
    for rank, (code, change, current_value) in enumerate(rows, 1):
        cur.execute(
            """
            INSERT INTO investor_rankings_snapshot_daily
              (id, trade_date, market, period, direction, investor_type, rank, stock_code,
               change, current_value, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (trade_date, market, period, direction, investor_type, rank) DO UPDATE SET
              stock_code = EXCLUDED.stock_code,
              change = EXCLUDED.change,
              current_value = EXCLUDED.current_value,
              created_at = NOW()
            """,
            (
                str(uuid.uuid4()).replace("-", "")[:25],
                trade_date,
                market,
                period,
                direction,
                investor_type,
                rank,
                code,
                int(change),
                int(current_value),
            ),
        )


def compute_snapshots(cur, trade_date: str) -> int:
    cur.execute(
        "DELETE FROM investor_rankings_snapshot_daily WHERE trade_date = %s",
        (trade_date,),
    )
    count = 0
    for investor_type in INVESTOR_TYPES:
        for market in MARKETS:
            for period_key, change_col in PERIODS:
                top, bottom = fetch_top_bottom(
                    cur, trade_date, market, investor_type, change_col, TOP_N
                )
                upsert_snapshots(
                    cur, trade_date, market, period_key, "top", investor_type, top
                )
                upsert_snapshots(
                    cur, trade_date, market, period_key, "bottom", investor_type, bottom
                )
                count += len(top) + len(bottom)
    return count


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trade-date", help="YYYY-MM-DD (기본: 최신)")
    args = parser.parse_args()

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                trade_date = resolve_trade_date(cur, args.trade_date)
                if not trade_date:
                    print("[compute_investor_snapshots] investor rankings 데이터 없음")
                    return 1

                print(f"[compute_investor_snapshots] trade_date={trade_date}")
                snap_n = compute_snapshots(cur, trade_date)
                print(f"[compute_investor_snapshots] 스냅샷 {snap_n}행 저장")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
