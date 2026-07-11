"""
외국인 지분·시세 일별 수집기 (pykrx → PostgreSQL)

시장 범위:
  --market KOSPI   코스피 전 종목
  --market KOSDAQ  코스닥 전 종목
  --market ALL     코스피+코스닥 전체 (기본값)

사용:
  py scripts/ingest.py
  py scripts/ingest.py --market KOSPI --days 120
  py scripts/ingest.py --market ALL --delay 0.3
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parents[1]


def load_env_file() -> None:
    """프로젝트 루트 .env 파일을 환경변수로 로드."""
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
    """수집은 로컬 DB 우선 (이후 sync_to_supabase로 Supabase 반영)."""
    url = os.environ.get("LOCAL_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("LOCAL_DATABASE_URL 또는 DATABASE_URL 환경변수가 필요합니다.")
    return psycopg2.connect(url)


def parse_column(df, candidates: list[str]) -> str:
    for col in candidates:
        if col in df.columns:
            return col
    raise ValueError(f"컬럼 없음: {candidates} / 실제: {df.columns.tolist()}")


def load_universe_from_db(market: str) -> list[tuple[str, str, str]]:
    """stocks 테이블에서 종목 목록 로드 (sync_stocks 후 빠름)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if market == "ALL":
                cur.execute(
                    "SELECT code, name, market FROM stocks ORDER BY market, code"
                )
            else:
                cur.execute(
                    "SELECT code, name, market FROM stocks WHERE market = %s ORDER BY code",
                    (market,),
                )
            rows = cur.fetchall()
            return [(r[0], r[1], r[2]) for r in rows]
    finally:
        conn.close()


def load_universe(market: str, ref_date: str) -> list[tuple[str, str, str]]:
    """종목 목록 (code, name, market). DB 우선, 없으면 pykrx."""
    db_rows = load_universe_from_db(market)
    if db_rows:
        print(f"[INFO] DB stocks 테이블에서 {len(db_rows)}종목 로드", flush=True)
        return db_rows

    from pykrx import stock

    markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]
    universe: list[tuple[str, str, str]] = []

    for m in markets:
        tickers = stock.get_market_ticker_list(ref_date, market=m)
        print(f"[INFO] {m} 종목 {len(tickers)}개 로드", flush=True)
        for i, code in enumerate(tickers, 1):
            name = stock.get_market_ticker_name(code)
            universe.append((code, name, m))
            if i % 200 == 0:
                print(f"[INFO] {m} 종목명 로드 {i}/{len(tickers)}", flush=True)

    return universe


def filter_missing_only(universe: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    """아직 지분 데이터가 없는 종목만 남김."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT stock_code FROM foreign_ownership_daily")
            have = {r[0] for r in cur.fetchall()}
        missing = [(c, n, m) for c, n, m in universe if c not in have]
        print(f"[INFO] 미수집 {len(missing)}종목 (기수집 {len(have)}종목 스킵)", flush=True)
        return missing
    finally:
        conn.close()


def fetch_foreign_rows(code: str, start: str, end: str) -> list[dict[str, Any]]:
    from pykrx import stock

    df = stock.get_exhaustion_rates_of_foreign_investment(start, end, code)
    if df is None or df.empty:
        return []

    ratio_col = parse_column(df, ["지분율", "외국인보유비율", "외국인지분율"])
    shares_col = parse_column(df, ["보유수량", "외국인보유수량"])
    listed_col = parse_column(df, ["상장주식수", "상장주식"])

    rows: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        date_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        rows.append(
            {
                "trade_date": date_str,
                "foreign_ratio_pct": round(float(row[ratio_col]), 4),
                "foreign_shares": int(row[shares_col]),
                "listed_shares": int(row[listed_col]),
            }
        )
    return rows


def fetch_market_rows(code: str, start: str, end: str) -> list[dict[str, Any]]:
    from pykrx import stock

    df = stock.get_market_ohlcv(start, end, code)
    if df is None or df.empty:
        return []

    open_col = parse_column(df, ["시가", "open"])
    high_col = parse_column(df, ["고가", "high"])
    low_col = parse_column(df, ["저가", "low"])
    close_col = parse_column(df, ["종가", "close"])
    volume_col = parse_column(df, ["거래량", "volume"])
    change_col = parse_column(df, ["등락률", "change"])

    rows: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        date_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        rows.append(
            {
                "trade_date": date_str,
                "open_price": float(row[open_col]),
                "high_price": float(row[high_col]),
                "low_price": float(row[low_col]),
                "close_price": float(row[close_col]),
                "volume": int(row[volume_col]),
                "change_pct": float(row[change_col]),
            }
        )
    return rows


def fetch_fundamental_rows(code: str, start: str, end: str) -> list[dict[str, Any]]:
    from pykrx import stock

    cap_df = stock.get_market_cap_by_date(start, end, code)
    if cap_df is None or cap_df.empty:
        return []

    fund_df = None
    try:
        fund_df = stock.get_market_fundamental_by_date(start, end, code)
        if fund_df is not None and fund_df.empty:
            fund_df = None
    except Exception:
        fund_df = None

    cap_col = parse_column(cap_df, ["시가총액", "market_cap"])
    listed_col = parse_column(cap_df, ["상장주식수", "listed_shares"])
    tv_col = parse_column(cap_df, ["거래대금", "trading_value"])

    rows: list[dict[str, Any]] = []
    for idx, row in cap_df.iterrows():
        date_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        fund_row = fund_df.loc[idx] if fund_df is not None and idx in fund_df.index else None
        rows.append(
            {
                "trade_date": date_str,
                "market_cap": int(row[cap_col]),
                "listed_shares": int(row[listed_col]),
                "trading_value": int(row[tv_col]) if tv_col in cap_df.columns else None,
                "per": float(fund_row["PER"]) if fund_row is not None and "PER" in fund_row else None,
                "pbr": float(fund_row["PBR"]) if fund_row is not None and "PBR" in fund_row else None,
                "eps": float(fund_row["EPS"]) if fund_row is not None and "EPS" in fund_row else None,
                "bps": float(fund_row["BPS"]) if fund_row is not None and "BPS" in fund_row else None,
                "div_yield": float(fund_row["DIV"]) if fund_row is not None and "DIV" in fund_row else None,
                "dps": float(fund_row["DPS"]) if fund_row is not None and "DPS" in fund_row else None,
            }
        )
    return rows


INVESTOR_TYPE_MAP = {
    "기관합계": "INSTITUTION",
    "개인": "INDIVIDUAL",
}


def fetch_investor_trading_rows(code: str, start: str, end: str) -> list[dict[str, Any]]:
    from pykrx import stock

    df = stock.get_market_trading_value_by_date(start, end, code, on="순매수")
    if df is None or df.empty:
        return []

    rows: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        date_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        for col, investor_type in INVESTOR_TYPE_MAP.items():
            if col not in df.columns:
                continue
            val = row[col]
            if val is None or (isinstance(val, float) and val != val):
                continue
            rows.append(
                {
                    "trade_date": date_str,
                    "investor_type": investor_type,
                    "net_value": int(val),
                }
            )
    return rows


def upsert_investor_trading(cur, code: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0

    values = [
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            r["trade_date"],
            r["investor_type"],
            r["net_value"],
            "pykrx",
            datetime.utcnow(),
        )
        for r in rows
    ]

    execute_values(
        cur,
        """
        INSERT INTO investor_trading_daily
          (id, stock_code, trade_date, investor_type, net_value, source, created_at)
        VALUES %s
        ON CONFLICT (stock_code, trade_date, investor_type) DO UPDATE SET
          net_value = EXCLUDED.net_value,
          source = EXCLUDED.source,
          created_at = EXCLUDED.created_at
        """,
        values,
    )
    return len(values)


def calc_net_sum(values: list[int], days: int) -> int:
    if not values:
        return 0
    tail = values[-days:] if len(values) >= days else values
    return int(sum(tail))


def count_consecutive_positive(values: list[int]) -> int:
    if not values:
        return 0
    count = 0
    for i in range(len(values) - 1, -1, -1):
        if values[i] > 0:
            count += 1
        else:
            break
    return count


def count_consecutive_negative(values: list[int]) -> int:
    if not values:
        return 0
    count = 0
    for i in range(len(values) - 1, -1, -1):
        if values[i] < 0:
            count += 1
        else:
            break
    return count


def compute_investor_rankings(cur, code: str, investor_type: str):
    cur.execute(
        """
        SELECT trade_date, net_value
        FROM investor_trading_daily
        WHERE stock_code = %s AND investor_type = %s
        ORDER BY trade_date ASC
        """,
        (code, investor_type),
    )
    rows = cur.fetchall()
    if not rows:
        return

    net_values = [int(r[1]) for r in rows]
    latest_date = rows[-1][0]
    streak_up = count_consecutive_positive(net_values)
    streak_down = count_consecutive_negative(net_values)

    cur.execute(
        """
        INSERT INTO investor_rankings_daily
          (id, stock_code, trade_date, investor_type, change_1d, change_5d, change_20d, change_60d,
           consecutive_up_days, consecutive_down_days, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (stock_code, trade_date, investor_type) DO UPDATE SET
          change_1d = EXCLUDED.change_1d,
          change_5d = EXCLUDED.change_5d,
          change_20d = EXCLUDED.change_20d,
          change_60d = EXCLUDED.change_60d,
          consecutive_up_days = EXCLUDED.consecutive_up_days,
          consecutive_down_days = EXCLUDED.consecutive_down_days,
          created_at = NOW()
        """,
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            latest_date,
            investor_type,
            net_values[-1],
            calc_net_sum(net_values, 5),
            calc_net_sum(net_values, 20),
            calc_net_sum(net_values, 60),
            streak_up,
            streak_down,
        ),
    )


def upsert_stock(cur, code: str, name: str, market: str):
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


def upsert_ownership(cur, code: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0

    values = [
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            r["trade_date"],
            r["foreign_ratio_pct"],
            r["foreign_shares"],
            r["listed_shares"],
            "pykrx",
            datetime.utcnow(),
        )
        for r in rows
    ]

    execute_values(
        cur,
        """
        INSERT INTO foreign_ownership_daily
          (id, stock_code, trade_date, foreign_ratio_pct, foreign_shares, listed_shares, source, created_at)
        VALUES %s
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          foreign_ratio_pct = EXCLUDED.foreign_ratio_pct,
          foreign_shares = EXCLUDED.foreign_shares,
          listed_shares = EXCLUDED.listed_shares,
          source = EXCLUDED.source,
          created_at = EXCLUDED.created_at
        """,
        values,
    )
    return len(values)


def upsert_market(cur, code: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0

    values = [
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            r["trade_date"],
            r["open_price"],
            r["high_price"],
            r["low_price"],
            r["close_price"],
            r["volume"],
            r["change_pct"],
            datetime.utcnow(),
        )
        for r in rows
    ]

    execute_values(
        cur,
        """
        INSERT INTO stock_market_daily
          (id, stock_code, trade_date, open_price, high_price, low_price, close_price, volume, change_pct, created_at)
        VALUES %s
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          open_price = EXCLUDED.open_price,
          high_price = EXCLUDED.high_price,
          low_price = EXCLUDED.low_price,
          close_price = EXCLUDED.close_price,
          volume = EXCLUDED.volume,
          change_pct = EXCLUDED.change_pct,
          created_at = EXCLUDED.created_at
        """,
        values,
    )
    return len(values)


def upsert_fundamentals(cur, code: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0

    values = [
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            r["trade_date"],
            r["market_cap"],
            r["listed_shares"],
            r.get("trading_value"),
            r.get("per"),
            r.get("pbr"),
            r.get("eps"),
            r.get("bps"),
            r.get("div_yield"),
            r.get("dps"),
            datetime.utcnow(),
        )
        for r in rows
    ]

    execute_values(
        cur,
        """
        INSERT INTO stock_fundamental_daily
          (id, stock_code, trade_date, market_cap, listed_shares, trading_value, per, pbr, eps, bps, div_yield, dps, created_at)
        VALUES %s
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          market_cap = EXCLUDED.market_cap,
          listed_shares = EXCLUDED.listed_shares,
          trading_value = EXCLUDED.trading_value,
          per = EXCLUDED.per,
          pbr = EXCLUDED.pbr,
          eps = EXCLUDED.eps,
          bps = EXCLUDED.bps,
          div_yield = EXCLUDED.div_yield,
          dps = EXCLUDED.dps,
          created_at = EXCLUDED.created_at
        """,
        values,
    )
    return len(values)


def calc_change(ratios: list[float], days: int) -> float:
    if not ratios:
        return 0.0
    end = ratios[-1]
    idx = max(0, len(ratios) - 1 - days)
    return round(end - ratios[idx], 4)


def count_consecutive_up(ratios: list[float]) -> int:
    if len(ratios) < 2:
        return 0
    count = 0
    for i in range(len(ratios) - 1, 0, -1):
        if ratios[i] > ratios[i - 1]:
            count += 1
        else:
            break
    return count


def count_consecutive_down(ratios: list[float]) -> int:
    if len(ratios) < 2:
        return 0
    count = 0
    for i in range(len(ratios) - 1, 0, -1):
        if ratios[i] < ratios[i - 1]:
            count += 1
        else:
            break
    return count


def compute_rankings(cur, code: str):
    cur.execute(
        """
        SELECT trade_date, foreign_ratio_pct
        FROM foreign_ownership_daily
        WHERE stock_code = %s
        ORDER BY trade_date ASC
        """,
        (code,),
    )
    rows = cur.fetchall()
    if not rows:
        return

    ratios = [float(r[1]) for r in rows]
    latest_date = rows[-1][0]
    streak_up = count_consecutive_up(ratios)
    streak_down = count_consecutive_down(ratios)

    cur.execute(
        """
        INSERT INTO rankings_daily
          (id, stock_code, trade_date, change_1d, change_5d, change_20d, change_60d,
           change_10d, change_30d,
           consecutive_up_days, consecutive_down_days, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          change_1d = EXCLUDED.change_1d,
          change_5d = EXCLUDED.change_5d,
          change_20d = EXCLUDED.change_20d,
          change_60d = EXCLUDED.change_60d,
          change_10d = EXCLUDED.change_10d,
          change_30d = EXCLUDED.change_30d,
          consecutive_up_days = EXCLUDED.consecutive_up_days,
          consecutive_down_days = EXCLUDED.consecutive_down_days,
          created_at = NOW()
        """,
        (
            str(uuid.uuid4()).replace("-", "")[:25],
            code,
            latest_date,
            calc_change(ratios, 1),
            calc_change(ratios, 5),
            calc_change(ratios, 20),
            calc_change(ratios, 60),
            calc_change(ratios, 10),
            calc_change(ratios, 30),
            streak_up,
            streak_down,
        ),
    )


def ingest_one(
    cur,
    code: str,
    name: str,
    market: str,
    start_str: str,
    end_str: str,
    with_alerts: bool,
    skip_fundamentals: bool = False,
    skip_investor: bool = False,
) -> tuple[int, int, int, bool]:
    """단일 종목 수집. (지분건수, 시세건수, 투자자건수, 성공여부)"""
    upsert_stock(cur, code, name, market)
    own_rows = fetch_foreign_rows(code, start_str, end_str)
    mkt_rows = fetch_market_rows(code, start_str, end_str)

    if not own_rows:
        return 0, 0, 0, False

    own_n = upsert_ownership(cur, code, own_rows)
    mkt_n = upsert_market(cur, code, mkt_rows)
    if not skip_fundamentals:
        fund_rows = fetch_fundamental_rows(code, start_str, end_str)
        upsert_fundamentals(cur, code, fund_rows)
    compute_rankings(cur, code)

    inv_n = 0
    if not skip_investor:
        inv_rows = fetch_investor_trading_rows(code, start_str, end_str)
        inv_n = upsert_investor_trading(cur, code, inv_rows)
        for investor_type in INVESTOR_TYPE_MAP.values():
            compute_investor_rankings(cur, code, investor_type)

    if with_alerts:
        evaluate_alerts(cur, code, name)

    return own_n, mkt_n, inv_n, True


def evaluate_alerts(cur, code: str, stock_name: str) -> int:
    cur.execute(
        """
        SELECT trade_date, foreign_ratio_pct
        FROM foreign_ownership_daily
        WHERE stock_code = %s ORDER BY trade_date ASC
        """,
        (code,),
    )
    rows = cur.fetchall()
    if len(rows) < 2:
        return 0

    ratios = [float(r[1]) for r in rows]
    latest_date = rows[-1][0]

    cur.execute(
        "SELECT change_60d FROM rankings_daily WHERE stock_code = %s AND trade_date = %s",
        (code, latest_date),
    )
    ranking_row = cur.fetchone()
    change60 = float(ranking_row[0]) if ranking_row else calc_change(ratios, 60)

    alerts: list[tuple[str, str, str]] = []
    if change60 >= 0.5:
        alerts.append(("CHANGE_60D_05", f"{stock_name}: 60일 +{change60:.2f}%p", "warning"))
    tail = ratios[-6:]
    if len(tail) >= 6 and all(tail[i] > tail[i - 1] for i in range(1, 6)):
        alerts.append(("STREAK_5D", f"{stock_name}: 5일 연속 증가", "info"))
    if ratios[-1] > max(ratios[:-1]):
        alerts.append(("NEW_HIGH", f"{stock_name}: 최고치 {ratios[-1]:.2f}%", "info"))

    created = 0
    for alert_type, message, severity in alerts:
        cur.execute(
            "SELECT 1 FROM alerts WHERE stock_code=%s AND alert_type=%s AND trade_date=%s",
            (code, alert_type, latest_date),
        )
        if cur.fetchone():
            continue
        cur.execute(
            """
            INSERT INTO alerts (id, stock_code, alert_type, message, trade_date, severity, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """,
            (str(uuid.uuid4()).replace("-", "")[:25], code, alert_type, message, latest_date, severity),
        )
        created += 1
    return created


def main():
    parser = argparse.ArgumentParser(description="Foreign Flow Detective 전종목 수집")
    parser.add_argument("--market", choices=["KOSPI", "KOSDAQ", "ALL"], default="ALL")
    parser.add_argument("--days", type=int, default=120, help="수집 캘린더 일수")
    parser.add_argument("--delay", type=float, default=0.25, help="종목 간 대기(초)")
    parser.add_argument("--with-alerts", action="store_true", help="알림 평가 (전종목 시 느림)")
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="지분 데이터 없는 종목만 수집 (이어하기)",
    )
    parser.add_argument(
        "--skip-fundamentals",
        action="store_true",
        help="PER/PBR 등 투자지표 수집 생략 (일일 갱신용)",
    )
    parser.add_argument(
        "--skip-snapshots",
        action="store_true",
        help="ingest 후 백분위·TOP10 스냅샷 생략 (CI 병렬 ingest 시 finalize에서 실행)",
    )
    parser.add_argument(
        "--skip-investor",
        action="store_true",
        help="기관·개인 순매수 수집 생략",
    )
    args = parser.parse_args()

    if not os.environ.get("KRX_ID") or not os.environ.get("KRX_PW"):
        print("[경고] KRX_ID/KRX_PW 미설정 — pykrx 실패 가능\n", file=sys.stderr)

    end = datetime.now()
    start = end - timedelta(days=args.days + 45)
    start_str = start.strftime("%Y%m%d")
    end_str = end.strftime("%Y%m%d")

    universe = load_universe(args.market, end_str)
    if args.only_missing:
        universe = filter_missing_only(universe)
    total_stocks = len(universe)
    print(f"\n[START] {args.market} {total_stocks}종목 수집 ({start_str}~{end_str})\n", flush=True)

    conn = get_connection()
    total_own = 0
    total_mkt = 0
    total_inv = 0
    ok = 0
    fail = 0

    try:
        with conn:
            with conn.cursor() as cur:
                for i, (code, name, market) in enumerate(universe, 1):
                    try:
                        own_n, mkt_n, inv_n, success = ingest_one(
                            cur,
                            code,
                            name,
                            market,
                            start_str,
                            end_str,
                            args.with_alerts,
                            args.skip_fundamentals,
                            args.skip_investor,
                        )
                        if success:
                            ok += 1
                            total_own += own_n
                            total_mkt += mkt_n
                            total_inv += inv_n
                        else:
                            fail += 1

                        if i % 50 == 0 or i == total_stocks:
                            print(
                                f"[{i}/{total_stocks}] 진행중... "
                                f"성공 {ok} / 실패 {fail} / 지분 {total_own}건 / 투자자 {total_inv}건",
                                flush=True,
                            )
                        conn.commit()
                    except Exception as exc:
                        fail += 1
                        conn.rollback()
                        print(f"[FAIL] {name} ({code}): {exc}", file=sys.stderr)

                    if args.delay > 0 and i < total_stocks:
                        time.sleep(args.delay)
    finally:
        conn.close()

    print(
        f"\n[DONE] 성공 {ok}, 실패 {fail}, 지분 {total_own}건, 시세 {total_mkt}건, 투자자 {total_inv}건",
        flush=True,
    )

    if ok > 0 and not args.skip_snapshots:
        import subprocess

        snap_script = ROOT / "scripts" / "compute_snapshots.py"
        print("\n[SNAPSHOT] 백분위·TOP10 계산...", flush=True)
        result = subprocess.run(
            [sys.executable, str(snap_script)],
            cwd=str(ROOT),
            capture_output=False,
        )
        if result.returncode != 0:
            print("[WARN] 스냅샷 계산 실패", file=sys.stderr)

    if ok == 0:
        print("[ERROR] 성공한 종목이 없습니다.", file=sys.stderr)
        sys.exit(1)
    if fail > 0:
        print(
            f"[WARN] 일부 종목 실패 — 성공 {ok}, 실패 {fail} (성공분은 DB 반영됨)",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
