"""기존 지분 데이터로 rankings_daily 변화율·백분위·스냅샷 재계산"""

from __future__ import annotations

import os
import subprocess
import sys
import uuid
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
        if key.strip() and key.strip() not in os.environ:
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_env_file()


def calc_change(ratios: list[float], days: int) -> float:
    if not ratios:
        return 0.0
    idx = max(0, len(ratios) - 1 - days)
    return round(ratios[-1] - ratios[idx], 4)


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


def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 필요")

    conn = psycopg2.connect(url)
    updated = 0
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT DISTINCT stock_code FROM foreign_ownership_daily")
                codes = [r[0] for r in cur.fetchall()]

                for code in codes:
                    cur.execute(
                        """
                        SELECT trade_date, foreign_ratio_pct
                        FROM foreign_ownership_daily
                        WHERE stock_code = %s ORDER BY trade_date ASC
                        """,
                        (code,),
                    )
                    rows = cur.fetchall()
                    if not rows:
                        continue

                    ratios = [float(r[1]) for r in rows]
                    latest = rows[-1][0]
                    streak_up = count_consecutive_up(ratios)
                    streak_down = count_consecutive_down(ratios)

                    cur.execute(
                        """
                        INSERT INTO rankings_daily
                          (id, stock_code, trade_date, change_1d, change_5d, change_20d, change_60d,
                           consecutive_up_days, consecutive_down_days, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
                          change_1d = EXCLUDED.change_1d,
                          change_5d = EXCLUDED.change_5d,
                          change_20d = EXCLUDED.change_20d,
                          change_60d = EXCLUDED.change_60d,
                          consecutive_up_days = EXCLUDED.consecutive_up_days,
                          consecutive_down_days = EXCLUDED.consecutive_down_days
                        """,
                        (
                            str(uuid.uuid4()).replace("-", "")[:25],
                            code,
                            latest,
                            calc_change(ratios, 1),
                            calc_change(ratios, 5),
                            calc_change(ratios, 20),
                            calc_change(ratios, 60),
                            streak_up,
                            streak_down,
                        ),
                    )
                    updated += 1

        print(f"[DONE] rankings 재계산 {updated}종목")
    finally:
        conn.close()

    print("[SNAPSHOT] 백분위·TOP10 계산...")
    subprocess.run([sys.executable, str(ROOT / "scripts" / "compute_snapshots.py")], check=False)


if __name__ == "__main__":
    main()
