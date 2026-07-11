import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { marketWhereClause } from "@/lib/market";
import type {
  InvestorRankingEntry,
  InvestorStreakEntry,
  InvestorType,
  MarketFilter,
  RankingPeriod,
} from "@/lib/types";

const PERIOD_FIELD: Record<
  RankingPeriod,
  "change1d" | "change5d" | "change20d" | "change60d"
> = {
  "1d": "change1d",
  "5d": "change5d",
  "20d": "change20d",
  "60d": "change60d",
};

export interface InvestorPeriodTopBottom {
  top: InvestorRankingEntry[];
  bottom: InvestorRankingEntry[];
  tradeDate: string | null;
}

function toNumber(value: bigint | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

function mapInvestorRankingRows(
  rows: Awaited<ReturnType<typeof queryInvestorRankings>>,
  field: "change1d" | "change5d" | "change20d" | "change60d",
): InvestorRankingEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    code: row.stockCode,
    name: row.stock.name,
    market: row.stock.market,
    currentValue: toNumber(row.stock.investorTrading[0]?.netValue),
    change: toNumber(row[field]),
    change1d: toNumber(row.change1d),
    change5d: toNumber(row.change5d),
    change20d: toNumber(row.change20d),
    change60d: toNumber(row.change60d),
    ownershipChange: null,
    tradeDate: row.tradeDate,
  }));
}

async function attachOwnershipChange(
  entries: InvestorRankingEntry[],
  period: RankingPeriod,
  tradeDate: string,
): Promise<InvestorRankingEntry[]> {
  if (entries.length === 0) return entries;
  const field = PERIOD_FIELD[period];
  const codes = entries.map((e) => e.code);
  try {
    const rows = await prisma.rankingDaily.findMany({
      where: { tradeDate, stockCode: { in: codes } },
      select: {
        stockCode: true,
        change1d: true,
        change5d: true,
        change20d: true,
        change60d: true,
      },
    });
    const byCode = new Map(rows.map((r) => [r.stockCode, r[field] ?? 0] as const));
    return entries.map((e) => ({
      ...e,
      ownershipChange: byCode.has(e.code) ? byCode.get(e.code)! : null,
    }));
  } catch {
    return entries;
  }
}

async function attachInvestorPeriodNets(
  entries: InvestorRankingEntry[],
  investorType: InvestorType,
  tradeDate: string,
): Promise<InvestorRankingEntry[]> {
  if (entries.length === 0) return entries;
  const codes = entries.map((e) => e.code);
  try {
    const rows = await prisma.investorRankingDaily.findMany({
      where: { tradeDate, stockCode: { in: codes }, investorType },
      select: {
        stockCode: true,
        change1d: true,
        change5d: true,
        change20d: true,
        change60d: true,
      },
    });
    const byCode = new Map(rows.map((r) => [r.stockCode, r]));
    return entries.map((e) => {
      const row = byCode.get(e.code);
      return {
        ...e,
        change1d: row ? toNumber(row.change1d) : e.change1d,
        change5d: row ? toNumber(row.change5d) : e.change5d,
        change20d: row ? toNumber(row.change20d) : e.change20d,
        change60d: row ? toNumber(row.change60d) : e.change60d,
      };
    });
  } catch {
    return entries;
  }
}

async function queryInvestorRankings(
  latestDate: string,
  investorType: InvestorType,
  period: RankingPeriod,
  limit: number,
  market: MarketFilter,
  direction: "desc" | "asc",
) {
  const field = PERIOD_FIELD[period];
  return prisma.investorRankingDaily.findMany({
    where: {
      tradeDate: latestDate,
      investorType,
      stock: marketWhereClause(market),
    },
    select: {
      stockCode: true,
      tradeDate: true,
      change1d: true,
      change5d: true,
      change20d: true,
      change60d: true,
      stock: {
        select: {
          name: true,
          market: true,
          investorTrading: {
            where: { tradeDate: latestDate, investorType },
            take: 1,
            select: { netValue: true },
          },
        },
      },
    },
    orderBy: { [field]: direction },
    take: limit,
  });
}

const getLatestInvestorTradeDate = unstable_cache(
  async (): Promise<string | null> => {
    try {
      const row = await prisma.investorRankingDaily.findFirst({
        orderBy: { tradeDate: "desc" },
        select: { tradeDate: true },
      });
      return row?.tradeDate ?? null;
    } catch (error) {
      console.error("[investor-ranking-service] getLatestInvestorTradeDate", error);
      return null;
    }
  },
  ["latest-investor-trade-date-v1"],
  { revalidate: 300 },
);

export async function getMinimalInvestorDashboardMeta(
  investorType: InvestorType,
): Promise<{
  hasData: boolean;
  lastUpdated: string;
  trackedCount: number;
}> {
  return unstable_cache(
    async () => {
      const latestDate = await getLatestInvestorTradeDate();
      if (!latestDate) {
        return { hasData: false, lastUpdated: "데이터 없음", trackedCount: 0 };
      }
      const trackedCount = await prisma.investorRankingDaily.count({
        where: { tradeDate: latestDate, investorType },
      });
      return {
        hasData: trackedCount > 0,
        lastUpdated: latestDate,
        trackedCount,
      };
    },
    ["minimal-investor-dashboard-meta-v1", investorType],
    { revalidate: 300 },
  )();
}

async function fetchTopBottomForDate(
  latestDate: string,
  investorType: InvestorType,
  period: RankingPeriod,
  limit: number,
  market: MarketFilter,
): Promise<InvestorPeriodTopBottom> {
  const field = PERIOD_FIELD[period];
  const [topRows, bottomRows] = await Promise.all([
    queryInvestorRankings(latestDate, investorType, period, limit, market, "desc"),
    queryInvestorRankings(latestDate, investorType, period, limit, market, "asc"),
  ]);

  const [top, bottom] = await Promise.all([
    attachOwnershipChange(mapInvestorRankingRows(topRows, field), period, latestDate),
    attachOwnershipChange(mapInvestorRankingRows(bottomRows, field), period, latestDate),
  ]);

  return {
    top,
    bottom,
    tradeDate: latestDate,
  };
}

export async function getInvestorTop10Snapshot(
  investorType: InvestorType,
  period: RankingPeriod = "60d",
  market: MarketFilter = "ALL",
): Promise<InvestorPeriodTopBottom> {
  return unstable_cache(
    () => fetchInvestorTop10Snapshot(investorType, period, market),
    ["investor-top10-snapshot", investorType, period, market, "v4"],
    { revalidate: 600 },
  )();
}

async function fetchInvestorTop10Snapshot(
  investorType: InvestorType,
  period: RankingPeriod,
  market: MarketFilter,
): Promise<InvestorPeriodTopBottom> {
  const latestDate = await getLatestInvestorTradeDate();
  const empty: InvestorPeriodTopBottom = { top: [], bottom: [], tradeDate: null };
  if (!latestDate) return empty;

  try {
    const [topRows, bottomRows] = await Promise.all([
      prisma.investorRankingSnapshotDaily.findMany({
        where: {
          tradeDate: latestDate,
          market,
          period,
          direction: "top",
          investorType,
        },
        orderBy: { rank: "asc" },
        take: 10,
        select: {
          rank: true,
          stockCode: true,
          change: true,
          currentValue: true,
          tradeDate: true,
          stock: { select: { name: true, market: true } },
        },
      }),
      prisma.investorRankingSnapshotDaily.findMany({
        where: {
          tradeDate: latestDate,
          market,
          period,
          direction: "bottom",
          investorType,
        },
        orderBy: { rank: "asc" },
        take: 10,
        select: {
          rank: true,
          stockCode: true,
          change: true,
          currentValue: true,
          tradeDate: true,
          stock: { select: { name: true, market: true } },
        },
      }),
    ]);

    if (topRows.length === 0) {
      return fetchTopBottomForDate(latestDate, investorType, period, 10, market);
    }

    const mapRow = (row: (typeof topRows)[0]): InvestorRankingEntry => ({
      rank: row.rank,
      code: row.stockCode,
      name: row.stock.name,
      market: row.stock.market,
      currentValue: toNumber(row.currentValue),
      change: toNumber(row.change),
      change1d: 0,
      change5d: 0,
      change20d: 0,
      change60d: 0,
      ownershipChange: null,
      tradeDate: row.tradeDate,
    });

    const enrich = async (rows: typeof topRows) => {
      const withOwn = await attachOwnershipChange(rows.map(mapRow), period, latestDate);
      return attachInvestorPeriodNets(withOwn, investorType, latestDate);
    };

    const [top, bottom] = await Promise.all([enrich(topRows), enrich(bottomRows)]);

    return {
      top,
      bottom,
      tradeDate: latestDate,
    };
  } catch (error) {
    console.error("[investor-ranking-service] getInvestorTop10Snapshot", error);
    return fetchTopBottomForDate(latestDate, investorType, period, 10, market);
  }
}

async function fetchAllPeriodInvestorRankings(
  investorType: InvestorType,
  limit: number,
  market: MarketFilter,
) {
  const latestDate = await getLatestInvestorTradeDate();
  const empty: InvestorPeriodTopBottom = { top: [], bottom: [], tradeDate: null };
  if (!latestDate) {
    return { "1d": empty, "5d": empty, "20d": empty, "60d": empty };
  }

  const [r1, r5, r20, r60] = await Promise.all([
    fetchTopBottomForDate(latestDate, investorType, "1d", limit, market),
    fetchTopBottomForDate(latestDate, investorType, "5d", limit, market),
    fetchTopBottomForDate(latestDate, investorType, "20d", limit, market),
    fetchTopBottomForDate(latestDate, investorType, "60d", limit, market),
  ]);

  return { "1d": r1, "5d": r5, "20d": r20, "60d": r60 };
}

export async function getAllPeriodInvestorRankings(
  investorType: InvestorType,
  limit = 15,
  market: MarketFilter = "ALL",
) {
  return unstable_cache(
    () => fetchAllPeriodInvestorRankings(investorType, limit, market),
    ["all-period-investor-rankings", investorType, String(limit), market, "v4"],
    { revalidate: 600 },
  )();
}

export async function getInvestorConsecutiveStreakTops(
  investorType: InvestorType,
  market: MarketFilter = "ALL",
  limit = 10,
  minStreak = 3,
): Promise<{
  inflow: InvestorStreakEntry[];
  outflow: InvestorStreakEntry[];
  tradeDate: string | null;
}> {
  return unstable_cache(
    () => fetchInvestorConsecutiveStreakTops(investorType, market, limit, minStreak),
    ["investor-consecutive-streak", investorType, market, String(limit), String(minStreak)],
    { revalidate: 300 },
  )();
}

async function fetchInvestorConsecutiveStreakTops(
  investorType: InvestorType,
  market: MarketFilter,
  limit: number,
  minStreak: number,
): Promise<{
  inflow: InvestorStreakEntry[];
  outflow: InvestorStreakEntry[];
  tradeDate: string | null;
}> {
  const tradeDate = await getLatestInvestorTradeDate();
  if (!tradeDate) {
    return { inflow: [], outflow: [], tradeDate: null };
  }

  try {
    const marketFilter = marketWhereClause(market);
    const rowSelect = {
      stockCode: true,
      change1d: true,
      change5d: true,
      change20d: true,
      change60d: true,
      consecutiveUpDays: true,
      consecutiveDownDays: true,
      stock: {
        select: {
          code: true,
          name: true,
          market: true,
          investorTrading: {
            where: { tradeDate, investorType },
            take: 1,
            select: { netValue: true },
          },
        },
      },
    } as const;

    const [inflowRows, outflowRows] = await Promise.all([
      prisma.investorRankingDaily.findMany({
        where: {
          tradeDate,
          investorType,
          consecutiveUpDays: { gte: minStreak },
          stock: marketFilter,
        },
        orderBy: [{ consecutiveUpDays: "desc" }, { change60d: "desc" }],
        take: limit,
        select: rowSelect,
      }),
      prisma.investorRankingDaily.findMany({
        where: {
          tradeDate,
          investorType,
          consecutiveDownDays: { gte: minStreak },
          stock: marketFilter,
        },
        orderBy: [{ consecutiveDownDays: "desc" }, { change60d: "asc" }],
        take: limit,
        select: rowSelect,
      }),
    ]);

    const toEntry = (
      row: (typeof inflowRows)[0],
      streakDays: number,
    ): InvestorStreakEntry => ({
      code: row.stock.code,
      name: row.stock.name,
      market: row.stock.market,
      currentValue: toNumber(row.stock.investorTrading[0]?.netValue),
      change1d: toNumber(row.change1d),
      change5d: toNumber(row.change5d),
      change20d: toNumber(row.change20d),
      change60d: toNumber(row.change60d),
      ownershipChange60d: null,
      streakDays,
      lastTradeDate: tradeDate,
    });

    const inflowBase = inflowRows.map((r) => toEntry(r, r.consecutiveUpDays));
    const outflowBase = outflowRows.map((r) => toEntry(r, r.consecutiveDownDays));
    const codes = [...new Set([...inflowBase, ...outflowBase].map((e) => e.code))];
    let ownershipMap = new Map<string, number>();
    if (codes.length > 0) {
      const ownRows = await prisma.rankingDaily.findMany({
        where: { tradeDate, stockCode: { in: codes } },
        select: { stockCode: true, change60d: true },
      });
      ownershipMap = new Map(ownRows.map((r) => [r.stockCode, r.change60d]));
    }

    const withOwn = (entries: InvestorStreakEntry[]) =>
      entries.map((e) => ({
        ...e,
        ownershipChange60d: ownershipMap.has(e.code) ? ownershipMap.get(e.code)! : null,
      }));

    return {
      inflow: withOwn(inflowBase),
      outflow: withOwn(outflowBase),
      tradeDate,
    };
  } catch (error) {
    console.error("[investor-ranking-service] getInvestorConsecutiveStreakTops", error);
    return { inflow: [], outflow: [], tradeDate };
  }
}
