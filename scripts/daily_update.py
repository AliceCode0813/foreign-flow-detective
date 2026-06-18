"""
하루 1회 자동 업데이트 — 종목 동기화 + 지분/시세 수집 + Supabase 반영

장 마감(15:30) 이후 KRX 데이터 반영을 위해 저녁 시간대 실행을 권장합니다.
Windows 작업 스케줄러: scripts/register_daily_task.ps1
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> int:
    print(f"\n>>> {' '.join(cmd)}\n", flush=True)
    return subprocess.call(cmd, cwd=ROOT)


def is_remote_only() -> bool:
    if "--remote-only" in sys.argv:
        return True
    return os.environ.get("REMOTE_ONLY", "").lower() in ("1", "true", "yes")


def parse_args() -> tuple[bool, str | None]:
    remote = is_remote_only()
    market: str | None = None
    argv = sys.argv[1:]
    if "--remote-only" in argv:
        argv = [a for a in argv if a != "--remote-only"]
    for i, arg in enumerate(argv):
        if arg == "--market" and i + 1 < len(argv):
            market = argv[i + 1]
            break
    return remote, market


def main() -> int:
    started = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    remote, market = parse_args()
    mode = "remote(Supabase 직접)" if remote else "local+sync"
    print(f"[daily_update] 시작 {started} ({mode})")

    ingest_market = market or "ALL"
    ingest_days = "5" if remote else "14"
    print(f"[daily_update] ingest --market {ingest_market} --days {ingest_days}")

    ingest_cmd = [
        sys.executable,
        "scripts/ingest.py",
        "--market",
        ingest_market,
        "--days",
        ingest_days,
        "--with-alerts",
        "--delay",
        "0.25",
    ]
    if remote:
        ingest_cmd.append("--skip-fundamentals")

    steps: list[list[str]] = [
        [sys.executable, "scripts/ensure_schema.py"],
        [sys.executable, "scripts/sync_stocks.py", "--market", "ALL"],
        ingest_cmd,
    ]
    if not remote:
        steps.append([sys.executable, "scripts/sync_to_supabase.py", "--full"])

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
