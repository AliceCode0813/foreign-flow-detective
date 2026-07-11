"""외국인 누적 순매수 랭킹 빠른 백필 (기간합 API, 시장당 수 회 호출).

  py scripts/backfill_foreign_net.py
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from supabase_env import get_supabase_url, read_env  # noqa: E402

PERIODS = [
    ("1d", 1),
    ("5d", 7),
    ("20d", 28),
    ("60d", 90),
]


def load_env() -> None:
    env = read_env()
    for k, v in env.items():
        if k not in os.environ:
            os.environ[k] = v


def ymd(d: datetime) -> str:
    return d.strftime("%Y%m%d")


def main() -> int:
    load_env()
    url = get_supabase_url()
    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute(
        """
        SELECT trade_date FROM rankings_daily
        GROUP BY trade_date HAVING COUNT(*) >= 2500
        ORDER BY trade_date DESC LIMIT 1
        """
    )
    row = cur.fetchone()
    if not row:
        print("no trade date")
        return 1
    trade_date = row[0]
    end = datetime.strptime(trade_date, "%Y-%m-%d")
    print(f"[foreign-net] trade_date={trade_date}")

    from pykrx import stock

    # code -> {change_1d, change_5d, ...}
    by_code: dict[str, dict[str, int]] = {}

    for market in ("KOSPI", "KOSDAQ"):
        for key, cal_days in PERIODS:
            start = end - timedelta(days=cal_days)
            print(f"  fetch {market} {key} {ymd(start)}-{ymd(end)} ...", flush=True)
            df = stock.get_market_net_purchases_of_equities_by_ticker(
                ymd(start), ymd(end), market, "외국인"
            )
            if df is None or df.empty:
                print(f"    empty")
                continue
            col = "순매수거래대금" if "순매수거래대금" in df.columns else df.columns[-1]
            for ticker, r in df.iterrows():
                code = str(ticker).zfill(6)
                try:
                    val = int(r[col])
                except Exception:
                    continue
                by_code.setdefault(code, {})[key] = val
            print(f"    rows={len(df)}")

    # only codes that exist in stocks
    cur.execute("SELECT code FROM stocks")
    valid = {r[0] for r in cur.fetchall()}
    values = []
    for code, periods in by_code.items():
        if code not in valid:
            continue
        values.append(
            (
                str(uuid.uuid4()).replace("-", "")[:25],
                code,
                trade_date,
                "FOREIGN",
                periods.get("1d", 0),
                periods.get("5d", 0),
                periods.get("20d", 0),
                periods.get("60d", 0),
                0,
                0,
                datetime.utcnow(),
            )
        )

    print(f"[foreign-net] upsert {len(values)} rankings...")
    execute_values(
        cur,
        """
        INSERT INTO investor_rankings_daily
          (id, stock_code, trade_date, investor_type,
           change_1d, change_5d, change_20d, change_60d,
           consecutive_up_days, consecutive_down_days, created_at)
        VALUES %s
        ON CONFLICT (stock_code, trade_date, investor_type) DO UPDATE SET
          change_1d = EXCLUDED.change_1d,
          change_5d = EXCLUDED.change_5d,
          change_20d = EXCLUDED.change_20d,
          change_60d = EXCLUDED.change_60d,
          created_at = EXCLUDED.created_at
        """,
        values,
        page_size=500,
    )

    # 당일 순매수 → investor_trading_daily (표시용)
    day_values = [
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            trade_date,
            "FOREIGN",
            periods.get("1d", 0),
            "pykrx",
            datetime.utcnow(),
        )
        for code, periods in by_code.items()
        if code in valid
    ]
    execute_values(
        cur,
        """
        INSERT INTO investor_trading_daily
          (id, stock_code, trade_date, investor_type, net_value, source, created_at)
        VALUES %s
        ON CONFLICT (stock_code, trade_date, investor_type) DO UPDATE SET
          net_value = EXCLUDED.net_value,
          created_at = EXCLUDED.created_at
        """,
        day_values,
        page_size=500,
    )

    conn.commit()
    cur.close()
    conn.close()
    print("[foreign-net] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
