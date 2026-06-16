"""로컬 / Supabase DB 용량 조회."""

from __future__ import annotations

import sys

import psycopg2

sys.path.insert(0, "scripts")
from supabase_env import get_supabase_url, read_env  # noqa: E402


def fmt_bytes(b: int) -> str:
    if b >= 1024**3:
        return f"{b / 1024**3:.2f} GB"
    if b >= 1024**2:
        return f"{b / 1024**2:.1f} MB"
    if b >= 1024:
        return f"{b / 1024:.0f} KB"
    return f"{b} B"


def sizes(url: str, label: str) -> None:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT relname,
               pg_total_relation_size(relid),
               pg_relation_size(relid),
               n_live_tup
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        """
    )
    rows = cur.fetchall()
    total = sum(r[1] for r in rows)
    print(f"=== {label} ===")
    print(f"{'table':<28} {'rows':>10} {'data':>10} {'total':>10}")
    for name, total_b, data_b, row_count in rows:
        print(
            f"{name:<28} {row_count or 0:>10,} "
            f"{fmt_bytes(data_b):>10} {fmt_bytes(total_b):>10}"
        )
    print(f"TOTAL: {fmt_bytes(total)} ({total:,} bytes)\n")
    conn.close()


def main() -> None:
    local = read_env().get("LOCAL_DATABASE_URL")
    if local:
        sizes(local, "Local PostgreSQL")
    try:
        sizes(get_supabase_url(), "Supabase")
    except Exception as exc:
        print(f"Supabase: 조회 실패 ({exc})")


if __name__ == "__main__":
    main()
