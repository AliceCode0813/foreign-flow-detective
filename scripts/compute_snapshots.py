"""
rankings_daily 기준 백분위·TOP10 스냅샷 사전 계산.

ingest 완료 후 또는 backfill_rankings 후 실행:
  py scripts/compute_snapshots.py
  py scripts/compute_snapshots.py --trade-date 2026-06-19
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
        SELECT trade_date FROM rankings_daily
        GROUP BY trade_date
        HAVING COUNT(*) >= 2500
        ORDER BY trade_date DESC
        LIMIT 1
        """
    )
    row = cur.fetchone()
    return row[0] if row else None


def compute_percentiles(cur, trade_date: str) -> int:
    """당일 cross-section 지분율 백분위 (0~100, 높을수록 상위)."""
    cur.execute(
        """
        WITH ratios AS (
          SELECT r.stock_code,
                 o.foreign_ratio_pct,
                 PERCENT_RANK() OVER (ORDER BY o.foreign_ratio_pct) * 100 AS pct
          FROM rankings_daily r
          JOIN foreign_ownership_daily o
            ON o.stock_code = r.stock_code AND o.trade_date = r.trade_date
          WHERE r.trade_date = %s
        )
        UPDATE rankings_daily rd
        SET foreign_ratio_percentile = ROUND(ratios.pct::numeric, 2)
        FROM ratios
        WHERE rd.stock_code = ratios.stock_code AND rd.trade_date = %s
        """,
        (trade_date, trade_date),
    )
    return cur.rowcount


def market_filter_sql(market: str) -> tuple[str, tuple]:
    if market == "ALL":
        return "", ()
    return " AND s.market = %s", (market,)


def fetch_top_bottom(
    cur,
    trade_date: str,
    market: str,
    change_col: str,
    limit: int,
) -> tuple[list[tuple], list[tuple]]:
    mfilter, mparams = market_filter_sql(market)
    base = f"""
        SELECT r.stock_code, r.{change_col}, o.foreign_ratio_pct, r.foreign_ratio_percentile
        FROM rankings_daily r
        JOIN stocks s ON s.code = r.stock_code
        JOIN foreign_ownership_daily o
          ON o.stock_code = r.stock_code AND o.trade_date = r.trade_date
        WHERE r.trade_date = %s{mfilter}
    """
    cur.execute(
        base + f" ORDER BY r.{change_col} DESC LIMIT %s",
        (trade_date, *mparams, limit),
    )
    top = cur.fetchall()
    cur.execute(
        base + f" ORDER BY r.{change_col} ASC LIMIT %s",
        (trade_date, *mparams, limit),
    )
    bottom = cur.fetchall()
    return top, bottom


def upsert_snapshots(
    cur,
    trade_date: str,
    market: str,
    period: str,
    direction: str,
    rows: list[tuple],
) -> None:
    for rank, (code, change, ratio, percentile) in enumerate(rows, 1):
        cur.execute(
            """
            INSERT INTO rankings_snapshot_daily
              (id, trade_date, market, period, direction, rank, stock_code,
               change, current_ratio, foreign_ratio_percentile, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (trade_date, market, period, direction, rank) DO UPDATE SET
              stock_code = EXCLUDED.stock_code,
              change = EXCLUDED.change,
              current_ratio = EXCLUDED.current_ratio,
              foreign_ratio_percentile = EXCLUDED.foreign_ratio_percentile,
              created_at = NOW()
            """,
            (
                str(uuid.uuid4()).replace("-", "")[:25],
                trade_date,
                market,
                period,
                direction,
                rank,
                code,
                float(change),
                float(ratio),
                float(percentile) if percentile is not None else None,
            ),
        )


def compute_snapshots(cur, trade_date: str) -> int:
    cur.execute(
        "DELETE FROM rankings_snapshot_daily WHERE trade_date = %s",
        (trade_date,),
    )
    count = 0
    for market in MARKETS:
        for period_key, change_col in PERIODS:
            top, bottom = fetch_top_bottom(cur, trade_date, market, change_col, TOP_N)
            upsert_snapshots(cur, trade_date, market, period_key, "top", top)
            upsert_snapshots(cur, trade_date, market, period_key, "bottom", bottom)
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
                    print("[compute_snapshots] rankings 데이터 없음")
                    return 1

                print(f"[compute_snapshots] trade_date={trade_date}")
                pct_n = compute_percentiles(cur, trade_date)
                print(f"[compute_snapshots] 백분위 {pct_n}종목")
                snap_n = compute_snapshots(cur, trade_date)
                print(f"[compute_snapshots] 스냅샷 {snap_n}행 저장")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
