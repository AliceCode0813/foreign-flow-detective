import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { marketWhereClause } from "@/lib/market";
import { getLatestTradeDate } from "@/lib/services/stock-service";
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

async function fetchRankingsForDate(
  latestDate: string,
  period: RankingPeriod,
  limit: number,
  market: MarketFilter,
): Promise<{ entries: RankingEntry[]; tradeDate: string }> {
  const field = PERIOD_FIELD[period];
  const rows = await prisma.rankingDaily.findMany({
    where: {
      tradeDate: latestDate,
      stock: marketWhereClause(market),
    },
    include: {
      stock: {
        include: {
          ownership: {
            where: { tradeDate: latestDate },
            take: 1,
          },
        },
      },
    },
    orderBy: { [field]: "desc" },
    take: limit,
  });

  const entries: RankingEntry[] = rows.map((row, i) => ({
    rank: i + 1,
    code: row.stockCode,
    name: row.stock.name,
    market: row.stock.market,
    currentRatio: row.stock.ownership[0]?.foreignRatioPct ?? 0,
    change: row[field] ?? 0,
    tradeDate: row.tradeDate,
  }));

  return { entries, tradeDate: latestDate };
}

export async function getRankings(
  period: RankingPeriod = "60d",
  limit = 10,
  market: MarketFilter = "ALL",
): Promise<{ entries: RankingEntry[]; tradeDate: string | null }> {
  try {
    const latestDate = await getLatestTradeDate();
    if (!latestDate) {
      return { entries: [], tradeDate: null };
    }
    return await fetchRankingsForDate(latestDate, period, limit, market);
  } catch (error) {
    console.error("[ranking-service]", error);
    return { entries: [], tradeDate: null };
  }
}

async function fetchAllPeriodRankings(limit: number, market: MarketFilter) {
  const latestDate = await getLatestTradeDate();
  if (!latestDate) {
    const empty = { entries: [] as RankingEntry[], tradeDate: null as string | null };
    return { "1d": empty, "10d": empty, "30d": empty, "60d": empty };
  }

  const [r1, r10, r30, r60] = await Promise.all([
    fetchRankingsForDate(latestDate, "1d", limit, market),
    fetchRankingsForDate(latestDate, "10d", limit, market),
    fetchRankingsForDate(latestDate, "30d", limit, market),
    fetchRankingsForDate(latestDate, "60d", limit, market),
  ]);

  return { "1d": r1, "10d": r10, "30d": r30, "60d": r60 };
}

export async function getAllPeriodRankings(limit = 10, market: MarketFilter = "ALL") {
  return unstable_cache(
    () => fetchAllPeriodRankings(limit, market),
    ["all-period-rankings", String(limit), market],
    { revalidate: 300 },
  )();
}
