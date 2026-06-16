"""로컬에만 있고 Supabase에 없는 행 수 확인."""

from __future__ import annotations

import sys

import psycopg2

sys.path.insert(0, "scripts")
from supabase_env import get_supabase_url, read_env  # noqa: E402

DAILY = [
    "foreign_ownership_daily",
    "rankings_daily",
    "stock_market_daily",
    "stock_fundamental_daily",
]


def missing_daily(local, remote, table: str) -> int:
    lc = psycopg2.connect(local)
    rc = psycopg2.connect(remote)
    try:
        with lc.cursor() as cur:
            cur.execute(
                f"""
                SELECT COUNT(*) FROM {table} l
                WHERE NOT EXISTS (
                  SELECT 1 FROM dblink(%s,
                    'SELECT stock_code, trade_date FROM {table}')
                    AS r(stock_code varchar(6), trade_date varchar(10))
                  WHERE r.stock_code = l.stock_code AND r.trade_date = l.trade_date
                )
                """
            )
    finally:
        lc.close()
        rc.close()
    return -1


def count_table(url: str, table: str) -> int:
    c = psycopg2.connect(url)
    cur = c.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    n = cur.fetchone()[0]
    c.close()
    return n


def main() -> None:
    local = read_env()["LOCAL_DATABASE_URL"]
    remote = get_supabase_url()
    print(f"{'table':<28} {'local':>10} {'remote':>10} {'diff':>10}")
    for table in [
        "stocks",
        *DAILY,
        "alerts",
        "watchlist",
    ]:
        l = count_table(local, table)
        r = count_table(remote, table)
        print(f"{table:<28} {l:>10,} {r:>10,} {l - r:>+10,}")


if __name__ == "__main__":
    main()
