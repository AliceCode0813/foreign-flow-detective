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

export interface PeriodTopBottom {
  top: RankingEntry[];
  bottom: RankingEntry[];
  tradeDate: string | null;
}

function mapRankingRows(
  rows: Awaited<ReturnType<typeof queryRankings>>,
  field: "change1d" | "change10d" | "change30d" | "change60d",
): RankingEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    code: row.stockCode,
    name: row.stock.name,
    market: row.stock.market,
    currentRatio: row.stock.ownership[0]?.foreignRatioPct ?? 0,
    change: row[field] ?? 0,
    tradeDate: row.tradeDate,
  }));
}

async function queryRankings(
  latestDate: string,
  period: RankingPeriod,
  limit: number,
  market: MarketFilter,
  direction: "desc" | "asc",
) {
  const field = PERIOD_FIELD[period];
  return prisma.rankingDaily.findMany({
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
    orderBy: { [field]: direction },
    take: limit,
  });
}

async function fetchTopBottomForDate(
  latestDate: string,
  period: RankingPeriod,
  limit: number,
  market: MarketFilter,
): Promise<PeriodTopBottom> {
  const field = PERIOD_FIELD[period];
  const [topRows, bottomRows] = await Promise.all([
    queryRankings(latestDate, period, limit, market, "desc"),
    queryRankings(latestDate, period, limit, market, "asc"),
  ]);

  return {
    top: mapRankingRows(topRows, field),
    bottom: mapRankingRows(bottomRows, field),
    tradeDate: latestDate,
  };
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
    const { top } = await fetchTopBottomForDate(latestDate, period, limit, market);
    return { entries: top, tradeDate: latestDate };
  } catch (error) {
    console.error("[ranking-service]", error);
    return { entries: [], tradeDate: null };
  }
}

async function fetchAllPeriodRankings(limit: number, market: MarketFilter) {
  const latestDate = await getLatestTradeDate();
  const empty: PeriodTopBottom = { top: [], bottom: [], tradeDate: null };
  if (!latestDate) {
    return { "1d": empty, "10d": empty, "30d": empty, "60d": empty };
  }

  const [r1, r10, r30, r60] = await Promise.all([
    fetchTopBottomForDate(latestDate, "1d", limit, market),
    fetchTopBottomForDate(latestDate, "10d", limit, market),
    fetchTopBottomForDate(latestDate, "30d", limit, market),
    fetchTopBottomForDate(latestDate, "60d", limit, market),
  ]);

  return { "1d": r1, "10d": r10, "30d": r30, "60d": r60 };
}

export async function getAllPeriodRankings(limit = 15, market: MarketFilter = "ALL") {
  return unstable_cache(
    () => fetchAllPeriodRankings(limit, market),
    ["all-period-rankings-v2", String(limit), market],
    { revalidate: 300 },
  )();
}
