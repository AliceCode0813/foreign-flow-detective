"""Vercel에 넣을 DATABASE_URL 출력 (비밀번호는 .env에서 읽음)."""

from __future__ import annotations

import sys

sys.path.insert(0, "scripts")
from supabase_env import build_vercel_database_url, read_env  # noqa: E402


def main() -> None:
    password = read_env().get("SUPABASE_DB_PASSWORD", "").strip()
    if not password:
        raise SystemExit(".env에 SUPABASE_DB_PASSWORD 필요")
    print("=== Vercel Environment Variables ===")
    print("Name: DATABASE_URL")
    print("Value:")
    print(build_vercel_database_url(password))
    print()
    print("Environment: Production (+ Preview 권장)")
    print("저장 후 Deployments → Redeploy")


if __name__ == "__main__":
    main()
