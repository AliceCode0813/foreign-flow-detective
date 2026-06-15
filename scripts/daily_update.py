"""
하루 1회 자동 업데이트 — 종목 마스터 동기화 + 최근 지분/시세 수집

장 마감(15:30) 이후 KRX 데이터 반영을 위해 저녁 시간대 실행을 권장합니다.
Windows 작업 스케줄러: scripts/register_daily_task.ps1
"""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> int:
    print(f"\n>>> {' '.join(cmd)}\n", flush=True)
    return subprocess.call(cmd, cwd=ROOT)


def main() -> int:
    started = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[daily_update] 시작 {started}")

    steps: list[list[str]] = [
        [sys.executable, "scripts/sync_stocks.py", "--market", "ALL"],
        [
            sys.executable,
            "scripts/ingest.py",
            "--market",
            "ALL",
            "--days",
            "14",
            "--with-alerts",
            "--delay",
            "0.25",
        ],
    ]

    for cmd in steps:
        code = run(cmd)
        if code != 0:
            print(f"[daily_update] 실패 (exit {code}): {' '.join(cmd)}", file=sys.stderr)
            return code

    finished = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[daily_update] 완료 {finished}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
