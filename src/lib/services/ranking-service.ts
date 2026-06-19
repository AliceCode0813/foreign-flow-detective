import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { marketWhereClause } from "@/lib/market";
import { getLatestTradeDate } from "@/lib/services/stock-service";
import type { MarketFilter, RankingEntry, RankingPeriod } from "@/lib/types";

const PERIOD_FIELD: Record<
  RankingPeriod,
  "change1d" | "change5d" | "change20d" | "change60d"
> = {
  "1d": "change1d",
  "5d": "change5d",
  "20d": "change20d",
  "60d": "change60d",
};

export interface PeriodTopBottom {
  top: RankingEntry[];
  bottom: RankingEntry[];
  tradeDate: string | null;
}

function mapRankingRows(
  rows: Awaited<ReturnType<typeof queryRankings>>,
  field: "change1d" | "change5d" | "change20d" | "change60d",
): RankingEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    code: row.stockCode,
    name: row.stock.name,
    market: row.stock.market,
    currentRatio: row.stock.ownership[0]?.foreignRatioPct ?? 0,
    change: row[field] ?? 0,
    foreignRatioPercentile: row.foreignRatioPercentile ?? null,
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
    select: {
      stockCode: true,
      tradeDate: true,
      change1d: true,
      change5d: true,
      change20d: true,
      change60d: true,
      foreignRatioPercentile: true,
      stock: {
        select: {
          name: true,
          market: true,
          ownership: {
            where: { tradeDate: latestDate },
            take: 1,
            select: { foreignRatioPct: true },
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

/** 사전 계산된 TOP10 스냅샷 (빠른 대시보드 초기 로드) */
export async function getTop10Snapshot(
  period: RankingPeriod = "60d",
  market: MarketFilter = "ALL",
): Promise<PeriodTopBottom> {
  return unstable_cache(
    () => fetchTop10Snapshot(period, market),
    ["top10-snapshot", period, market],
    { revalidate: 300 },
  )();
}

async function fetchTop10Snapshot(
  period: RankingPeriod,
  market: MarketFilter,
): Promise<PeriodTopBottom> {
  const latestDate = await getLatestTradeDate();
  const empty: PeriodTopBottom = { top: [], bottom: [], tradeDate: null };
  if (!latestDate) return empty;

  try {
    const [topRows, bottomRows] = await Promise.all([
      prisma.rankingSnapshotDaily.findMany({
        where: { tradeDate: latestDate, market, period, direction: "top" },
        orderBy: { rank: "asc" },
        take: 10,
        select: {
          rank: true,
          stockCode: true,
          change: true,
          currentRatio: true,
          foreignRatioPercentile: true,
          tradeDate: true,
          stock: { select: { name: true, market: true } },
        },
      }),
      prisma.rankingSnapshotDaily.findMany({
        where: { tradeDate: latestDate, market, period, direction: "bottom" },
        orderBy: { rank: "asc" },
        take: 10,
        select: {
          rank: true,
          stockCode: true,
          change: true,
          currentRatio: true,
          foreignRatioPercentile: true,
          tradeDate: true,
          stock: { select: { name: true, market: true } },
        },
      }),
    ]);

    if (topRows.length === 0) {
      return fetchTopBottomForDate(latestDate, period, 10, market);
    }

    const mapRow = (row: (typeof topRows)[0]): RankingEntry => ({
      rank: row.rank,
      code: row.stockCode,
      name: row.stock.name,
      market: row.stock.market,
      currentRatio: row.currentRatio,
      change: row.change,
      foreignRatioPercentile: row.foreignRatioPercentile,
      tradeDate: row.tradeDate,
    });

    return {
      top: topRows.map(mapRow),
      bottom: bottomRows.map(mapRow),
      tradeDate: latestDate,
    };
  } catch (error) {
    console.error("[ranking-service] getTop10Snapshot", error);
    return fetchTopBottomForDate(latestDate, period, 10, market);
  }
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
    return { "1d": empty, "5d": empty, "20d": empty, "60d": empty };
  }

  const [r1, r5, r20, r60] = await Promise.all([
    fetchTopBottomForDate(latestDate, "1d", limit, market),
    fetchTopBottomForDate(latestDate, "5d", limit, market),
    fetchTopBottomForDate(latestDate, "20d", limit, market),
    fetchTopBottomForDate(latestDate, "60d", limit, market),
  ]);

  return { "1d": r1, "5d": r5, "20d": r20, "60d": r60 };
}

export async function getAllPeriodRankings(limit = 15, market: MarketFilter = "ALL") {
  return unstable_cache(
    () => fetchAllPeriodRankings(limit, market),
    ["all-period-rankings-v3", String(limit), market],
    { revalidate: 300 },
  )();
}
