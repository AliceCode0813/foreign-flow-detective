"""Supabase + Prisma 진단 (Vercel과 동일한 쿼리 패턴)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from supabase_env import build_vercel_database_url, get_supabase_url, read_env  # noqa: E402


def run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return {"ok": False, "error": result.stderr.strip() or result.stdout.strip()}
    try:
        return json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return {"ok": True, "raw": result.stdout.strip()}


def main() -> None:
    env = read_env()
    pooler_url = build_vercel_database_url(env["SUPABASE_DB_PASSWORD"])
    direct_url = get_supabase_url()

    script_tpl = """
const {{ PrismaClient }} = require("@prisma/client");
process.env.DATABASE_URL = {url!r};
const prisma = new PrismaClient();
(async () => {{
  try {{
    const [stockCount, latest, rankingCount, statsSample] = await Promise.all([
      prisma.stock.count(),
      prisma.foreignOwnershipDaily.findFirst({{ orderBy: {{ tradeDate: "desc" }}, select: {{ tradeDate: true }} }}),
      prisma.rankingDaily.count({{ where: {{ tradeDate: "2026-06-12" }} }}),
      prisma.rankingDaily.aggregate({{
        where: {{ tradeDate: "2026-06-12" }},
        _avg: {{ change1d: true, change10d: true, change30d: true, change60d: true }},
        _count: true,
      }}),
    ]);
    console.log(JSON.stringify({{
      ok: true,
      stockCount,
      latestTradeDate: latest?.tradeDate ?? null,
      rankingCount20260612: rankingCount,
      aggregateCount: statsSample._count,
      avgChange10d: statsSample._avg.change10d,
    }}));
  }} catch (e) {{
    console.log(JSON.stringify({{ ok: false, error: e.message }}));
    process.exit(1);
  }} finally {{
    await prisma.$disconnect();
  }}
}})();
"""

    print("=== Direct pooler (5432) ===")
    print(run_node(script_tpl.format(url=direct_url)))

    print("\n=== Vercel pooler (6543 + pgbouncer) ===")
    print(run_node(script_tpl.format(url=pooler_url)))


if __name__ == "__main__":
    main()
