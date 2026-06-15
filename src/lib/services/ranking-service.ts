import { prisma } from "@/lib/db";
import { marketWhereClause } from "@/lib/market";
import type { MarketFilter, RankingEntry, RankingPeriod } from "@/lib/types";

const PERIOD_FIELD: Record<
  RankingPeriod,
  "change1d" | "change10d" | "change30d" | "change60d"
> = {
  "1d": "change1d",
  "10d": "change10d",
  "30d": "change30d",
  "60d": "change60d",
};

export async function getRankings(
  period: RankingPeriod = "60d",
  limit = 10,
  market: MarketFilter = "ALL",
): Promise<{ entries: RankingEntry[]; tradeDate: string | null }> {
  try {
    const latest = await prisma.rankingDaily.findFirst({
      orderBy: { tradeDate: "desc" },
      select: { tradeDate: true },
    });

    if (!latest) {
      return { entries: [], tradeDate: null };
    }

    const field = PERIOD_FIELD[period];
    const rows = await prisma.rankingDaily.findMany({
      where: {
        tradeDate: latest.tradeDate,
        stock: marketWhereClause(market),
      },
      include: {
        stock: {
          include: {
            ownership: {
              where: { tradeDate: latest.tradeDate },
              take: 1,
            },
          },
        },
      },
    });

    const sorted = rows
      .map((row) => ({
        code: row.stockCode,
        name: row.stock.name,
        market: row.stock.market,
        currentRatio: row.stock.ownership[0]?.foreignRatioPct ?? 0,
        change: row[field] ?? 0,
        tradeDate: row.tradeDate,
      }))
      .sort((a, b) => b.change - a.change)
      .slice(0, limit);

    const entries: RankingEntry[] = sorted.map((item, i) => ({
      rank: i + 1,
      code: item.code,
      name: item.name,
      market: item.market,
      currentRatio: item.currentRatio,
      change: item.change,
      tradeDate: item.tradeDate,
    }));

    return { entries, tradeDate: latest.tradeDate };
  } catch (error) {
    console.error("[ranking-service]", error);
    return { entries: [], tradeDate: null };
  }
}

export async function getAllPeriodRankings(
  limit = 10,
  market: MarketFilter = "ALL",
) {
  const [r1, r10, r30, r60] = await Promise.all([
    getRankings("1d", limit, market),
    getRankings("10d", limit, market),
    getRankings("30d", limit, market),
    getRankings("60d", limit, market),
  ]);
  return { "1d": r1, "10d": r10, "30d": r30, "60d": r60 };
}
