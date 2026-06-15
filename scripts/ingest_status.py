"""수집 진행 상황 요약"""
import os
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM stocks")
stocks = cur.fetchone()[0]
cur.execute("SELECT COUNT(DISTINCT stock_code) FROM foreign_ownership_daily")
owned = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM foreign_ownership_daily")
rows = cur.fetchone()[0]
conn.close()
print(f"stocks={stocks} with_ownership={owned} ownership_rows={rows}")
