"""Supabase 연결 설정 + db:push."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from supabase_env import get_supabase_url, write_database_url  # noqa: E402


def main() -> int:
    url = get_supabase_url()
    write_database_url(url)
    os.environ["DATABASE_URL"] = url
    print(f"[setup] DATABASE_URL 적용: ...@{url.split('@', 1)[1]}")

    env = os.environ.copy()
    env["PATH"] = r"C:\Program Files\nodejs;" + env.get("PATH", "")

    print("[setup] prisma db push 실행...")
    result = subprocess.run(
        ["npm.cmd", "run", "db:push"],
        cwd=ROOT,
        env=env,
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
