"""로컬 PostgreSQL에만 ensure_schema 적용."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

env_path = ROOT / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key == "DATABASE_URL":
            continue
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value

os.environ.pop("DATABASE_URL", None)

from ensure_schema import main

if __name__ == "__main__":
    url = os.environ.get("LOCAL_DATABASE_URL", "")
    print(f"[local_schema] target: {url.split('@')[-1] if '@' in url else url}")
    raise SystemExit(main())
