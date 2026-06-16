"""Supabase DATABASE_URL 빌드 (@ 등 특수문자 URL 인코딩)."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"

SUPABASE_HOST = "db.pcdhshflarandsdwuddb.supabase.co"
SUPABASE_PROJECT_REF = "pcdhshflarandsdwuddb"
SUPABASE_POOLER_HOST = "aws-1-ap-northeast-2.pooler.supabase.com"


def build_database_url(password: str, *, mode: str = "pooler") -> str:
    encoded = quote(password, safe="")
    timeout_opt = "?options=-c%20statement_timeout%3D0"
    if mode == "direct":
        return f"postgresql://postgres:{encoded}@{SUPABASE_HOST}:5432/postgres{timeout_opt}"
    return (
        f"postgresql://postgres.{SUPABASE_PROJECT_REF}:{encoded}"
        f"@{SUPABASE_POOLER_HOST}:5432/postgres{timeout_opt}"
    )


def build_vercel_database_url(password: str) -> str:
    """Vercel 서버리스용 — Transaction pooler + pgbouncer."""
    encoded = quote(password, safe="")
    return (
        f"postgresql://postgres.{SUPABASE_PROJECT_REF}:{encoded}"
        f"@{SUPABASE_POOLER_HOST}:6543/postgres?pgbouncer=true"
    )


def read_env() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {}
    data: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] == '"':
            value = value[1:-1]
        data[key.strip()] = value
    return data


def write_database_url(url: str) -> None:
    text = ENV_PATH.read_text(encoding="utf-8") if ENV_PATH.exists() else ""
    line = f'DATABASE_URL="{url}"'
    if re.search(r"^DATABASE_URL=", text, flags=re.MULTILINE):
        text = re.sub(r'^DATABASE_URL=.*$', line, text, flags=re.MULTILINE)
    else:
        text = line + "\n" + text
    ENV_PATH.write_text(text, encoding="utf-8")


def get_supabase_url() -> str:
    env = read_env()
    password = env.get("SUPABASE_DB_PASSWORD", "").strip()
    if not password:
        raise RuntimeError(
            ".env에 SUPABASE_DB_PASSWORD=비밀번호 를 추가하세요 (@ 포함 그대로 가능)"
        )
    return build_database_url(password)
