import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { inferOwnershipChange } from "@/lib/inference";
import { marketWhereClause } from "@/lib/market";
import type { ConsecutiveInflowEntry, MarketFilter, OwnershipMoverRow } from "@/lib/types";
import { getLatestTradeDate } from "./stock-service";

type RecentOwnership = {
  tradeDate: string;
  foreignRatioPct: number;
  foreignShares: bigint | null;
  listedShares: bigint | null;
};

type RecentMarket = {
  tradeDate: string;
  closePrice: number;
  volume: bigint;
};

const HISTORY_DAYS = 60;
const HISTORY_CALENDAR_BUFFER = 95;
const DEFAULT_SPARKLINE_TOP = 80;

export interface GetOwnershipMoversOptions {
  sparklineTop?: number;
  /** 0 = 제한 없음 (기본: 전체 rankings) */
  limit?: number;
}

function subtractCalendarDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function groupRecentByCode<T extends { stockCode: string }>(
  rows: T[],
  limit: number,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.stockCode) ?? [];
    if (list.length < limit) {
      list.push(row);
      map.set(row.stockCode, list);
    }
  }
  return map;
}

function calcPriceChange1d(market: RecentMarket[]): number {
  if (market.length < 2) return 0;
  const latest = market[0];
  const prev = market[1];
  if (!prev.closePrice) return 0;
  return ((latest.closePrice - prev.closePrice) / prev.closePrice) * 100;
}

function calcPriceChange60d(market: RecentMarket[]): number {
  if (market.length < 2) return 0;
  const latest = market[0];
  const base = market[Math.min(market.length - 1, HISTORY_DAYS - 1)];
  if (!base?.closePrice) return 0;
  return ((latest.closePrice - base.closePrice) / base.closePrice) * 100;
}

function calcVolumeRatio(market: RecentMarket[]): number {
  if (market.length === 0) return 1;
  const latestVol = Number(market[0].volume);
  if (market.length < 2) return 1;
  const avg =
    market.slice(0, Math.min(5, market.length)).reduce((s, m) => s + Number(m.volume), 0) /
    Math.min(5, market.length);
  return avg > 0 ? latestVol / avg : 1;
}

export function countConsecutiveUpDays(historyAsc: number[]): number {
  if (historyAsc.length < 2) return 0;
  let count = 0;
  for (let i = historyAsc.length - 1; i > 0; i--) {
    if (historyAsc[i] > historyAsc[i - 1]) count++;
    else break;
  }
  return count;
}

function buildRatioHistory60d(ownership: RecentOwnership[]): number[] {
  const slice = ownership.slice(0, HISTORY_DAYS);
  return slice.reverse().map((o) => o.foreignRatioPct);
}

function buildMoverRow(
  stock: {
    code: string;
    name: string;
    market: string;
    sector: string | null;
  },
  ranking: {
    change1d: number;
    change5d: number;
    change20d: number;
    change60d: number;
    foreignRatioPercentile: number | null;
  },
  ownership: RecentOwnership[],
  market: RecentMarket[],
  tradeDate: string,
  ratioHistory60d: number[],
): OwnershipMoverRow | null {
  if (ownership.length === 0) return null;

  const latestOwn = ownership[0];
  const prevOwn = ownership[1];
  const latestMkt = market[0];

  const closePrice = latestMkt?.closePrice ?? 0;
  const listedShares = Number(latestOwn.listedShares ?? 0);
  const marketCap = closePrice > 0 && listedShares > 0 ? closePrice * listedShares : 0;
  const priceChange1d = calcPriceChange1d(market);
  const priceChange60d = calcPriceChange60d(market);
  const volume = latestMkt ? Number(latestMkt.volume) : 0;

  const foreignSharesChange =
    prevOwn?.foreignShares != null && latestOwn.foreignShares != null
      ? Number(latestOwn.foreignShares) - Number(prevOwn.foreignShares)
      : 0;
  const listedSharesChange =
    prevOwn?.listedShares != null && latestOwn.listedShares != null
      ? Number(latestOwn.listedShares) - Number(prevOwn.listedShares)
      : 0;

  const change1d = ranking.change1d ?? 0;
  const change60d = ranking.change60d ?? 0;

  return {
    code: stock.code,
    name: stock.name,
    market: stock.market,
    sector: stock.sector,
    currentRatio: latestOwn.foreignRatioPct,
    change1d,
    change5d: ranking.change5d ?? 0,
    change20d: ranking.change20d ?? 0,
    change60d,
    foreignRatioPercentile: ranking.foreignRatioPercentile,
    lastTradeDate: tradeDate,
    absChange1d: Math.abs(change1d),
    absChange60d: Math.abs(change60d),
    marketCap,
    closePrice,
    priceChange1d,
    priceChange60d,
    volume,
    ratioHistory60d,
    consecutiveUpDays: countConsecutiveUpDays(ratioHistory60d),
    inference: inferOwnershipChange({
      change1d: change60d,
      priceChange1d: priceChange60d,
      foreignSharesChange,
      listedSharesChange,
      volumeRatio: calcVolumeRatio(market),
    }),
  };
}

export async function getOwnershipMovers(
  market: MarketFilter = "ALL",
  options: GetOwnershipMoversOptions = {},
): Promise<OwnershipMoverRow[]> {
  const tradeDate = await getLatestTradeDate();
  if (!tradeDate) return [];

  const sparklineTop = options.sparklineTop ?? DEFAULT_SPARKLINE_TOP;

  try {
    const rankings = await prisma.rankingDaily.findMany({
      where: {
        tradeDate,
        stock: marketWhereClause(market),
      },
      select: {
        stockCode: true,
        change1d: true,
        change5d: true,
        change20d: true,
        change60d: true,
        foreignRatioPercentile: true,
        stock: {
          select: { code: true, name: true, market: true, sector: true },
        },
      },
    });

    if (rankings.length === 0) return [];

    const codes = rankings.map((r) => r.stockCode);

    const [latestOwnership, latestMarket] = await Promise.all([
      prisma.foreignOwnershipDaily.findMany({
        where: { stockCode: { in: codes }, tradeDate },
        select: {
          stockCode: true,
          tradeDate: true,
          foreignRatioPct: true,
          foreignShares: true,
          listedShares: true,
        },
      }),
      prisma.stockMarketDaily.findMany({
        where: { stockCode: { in: codes }, tradeDate },
        select: { stockCode: true, tradeDate: true, closePrice: true, volume: true },
      }),
    ]);

    const prevDateRows = await prisma.foreignOwnershipDaily.findMany({
      where: { stockCode: { in: codes }, tradeDate: { lt: tradeDate } },
      orderBy: [{ stockCode: "asc" }, { tradeDate: "desc" }],
      distinct: ["stockCode"],
      select: {
        stockCode: true,
        tradeDate: true,
        foreignRatioPct: true,
        foreignShares: true,
        listedShares: true,
      },
    });

    const prevMarketRows = await prisma.stockMarketDaily.findMany({
      where: { stockCode: { in: codes }, tradeDate: { lt: tradeDate } },
      orderBy: [{ stockCode: "asc" }, { tradeDate: "desc" }],
      distinct: ["stockCode"],
      select: { stockCode: true, tradeDate: true, closePrice: true, volume: true },
    });

    const ownLatestMap = new Map(latestOwnership.map((r) => [r.stockCode, r]));
    const mktLatestMap = new Map(latestMarket.map((r) => [r.stockCode, r]));
    const ownPrevMap = new Map(prevDateRows.map((r) => [r.stockCode, r]));
    const mktPrevMap = new Map(prevMarketRows.map((r) => [r.stockCode, r]));

    const moversDraft: OwnershipMoverRow[] = [];
    for (const row of rankings) {
      const latestOwn = ownLatestMap.get(row.stockCode);
      if (!latestOwn) continue;
      const prevOwn = ownPrevMap.get(row.stockCode);
      const latestMkt = mktLatestMap.get(row.stockCode);
      const prevMkt = mktPrevMap.get(row.stockCode);

      const ownership: RecentOwnership[] = [latestOwn, ...(prevOwn ? [prevOwn] : [])];
      const marketRows: RecentMarket[] = [
        ...(latestMkt ? [latestMkt] : []),
        ...(prevMkt ? [prevMkt] : []),
      ];

      const built = buildMoverRow(
        row.stock,
        row,
        ownership,
        marketRows,
        tradeDate,
        [],
      );
      if (built) moversDraft.push(built);
    }

    const sparklineCodes = new Set(
      [...moversDraft]
        .sort((a, b) => b.absChange60d - a.absChange60d)
        .slice(0, sparklineTop)
        .map((m) => m.code),
    );

    let sparklineMap = new Map<string, number[]>();
    if (sparklineCodes.size > 0) {
      const historySince = subtractCalendarDays(tradeDate, HISTORY_CALENDAR_BUFFER);
      const ownershipRows = await prisma.foreignOwnershipDaily.findMany({
        where: {
          stockCode: { in: [...sparklineCodes] },
          tradeDate: { gte: historySince, lte: tradeDate },
        },
        orderBy: [{ stockCode: "asc" }, { tradeDate: "desc" }],
        select: { stockCode: true, foreignRatioPct: true },
      });
      const byCode = groupRecentByCode(
        ownershipRows.map((r) => ({
          stockCode: r.stockCode,
          tradeDate,
          foreignRatioPct: r.foreignRatioPct,
          foreignShares: null,
          listedShares: null,
        })),
        HISTORY_DAYS,
      );
      sparklineMap = new Map(
        [...sparklineCodes].map((code) => [code, buildRatioHistory60d(byCode.get(code) ?? [])]),
      );
    }

    const movers = moversDraft.map((m) => ({
      ...m,
      ratioHistory60d: sparklineMap.get(m.code) ?? [],
      consecutiveUpDays: countConsecutiveUpDays(sparklineMap.get(m.code) ?? []),
    }));

    if (options.limit && options.limit > 0) {
      return movers
        .sort((a, b) => b.absChange60d - a.absChange60d)
        .slice(0, options.limit);
    }

    return movers;
  } catch (error) {
    console.error("[mover-service]", error);
    return [];
  }
}

export async function getDailyVolatilityTop(
  market: MarketFilter = "ALL",
  limit = 10,
): Promise<OwnershipMoverRow[]> {
  const movers = await getOwnershipMovers(market, { sparklineTop: limit, limit: 500 });
  return movers
    .filter((m) => m.absChange1d > 0)
    .sort((a, b) => b.absChange1d - a.absChange1d)
    .slice(0, limit);
}

const EMPTY_INFERENCE = {
  tags: [] as string[],
  summary: "",
  method: "rule" as const,
};

export async function getConsecutiveStreakTops(
  market: MarketFilter = "ALL",
  limit = 10,
  minStreak = 3,
): Promise<{
  inflow: ConsecutiveInflowEntry[];
  outflow: ConsecutiveInflowEntry[];
  tradeDate: string | null;
}> {
  return unstable_cache(
    () => fetchConsecutiveStreakTops(market, limit, minStreak),
    ["consecutive-streak-v2", market, String(limit), String(minStreak)],
    { revalidate: 300 },
  )();
}

async function fetchConsecutiveStreakTops(
  market: MarketFilter,
  limit: number,
  minStreak: number,
): Promise<{
  inflow: ConsecutiveInflowEntry[];
  outflow: ConsecutiveInflowEntry[];
  tradeDate: string | null;
}> {
  const tradeDate = await getLatestTradeDate();
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
      foreignRatioPercentile: true,
      consecutiveUpDays: true,
      consecutiveDownDays: true,
      stock: {
        select: {
          code: true,
          name: true,
          market: true,
          sector: true,
          ownership: {
            where: { tradeDate },
            take: 1,
            select: { foreignRatioPct: true },
          },
        },
      },
    } as const;

    const [inflowRows, outflowRows] = await Promise.all([
      prisma.rankingDaily.findMany({
        where: {
          tradeDate,
          consecutiveUpDays: { gte: minStreak },
          stock: marketFilter,
        },
        orderBy: [{ consecutiveUpDays: "desc" }, { change60d: "desc" }],
        take: limit,
        select: rowSelect,
      }),
      prisma.rankingDaily.findMany({
        where: {
          tradeDate,
          consecutiveDownDays: { gte: minStreak },
          stock: marketFilter,
        },
        orderBy: [{ consecutiveDownDays: "desc" }, { change60d: "asc" }],
        take: limit,
        select: rowSelect,
      }),
    ]);

    const codes = [...inflowRows, ...outflowRows].map((r) => r.stockCode);
    const sparklines = await fetchSparklines(codes, tradeDate);

    const inflow = inflowRows.map((row) =>
      toStreakEntry(row, row.consecutiveUpDays, tradeDate, sparklines.get(row.stockCode) ?? []),
    );
    const outflow = outflowRows.map((row) =>
      toStreakEntry(row, row.consecutiveDownDays, tradeDate, sparklines.get(row.stockCode) ?? []),
    );

    return { inflow, outflow, tradeDate };
  } catch (error) {
    console.error("[mover-service] getConsecutiveStreakTops", error);
    return { inflow: [], outflow: [], tradeDate };
  }
}

async function fetchSparklines(
  codes: string[],
  tradeDate: string,
): Promise<Map<string, number[]>> {
  if (codes.length === 0) return new Map();

  const historySince = subtractCalendarDays(tradeDate, HISTORY_CALENDAR_BUFFER);
  const ownershipRows = await prisma.foreignOwnershipDaily.findMany({
    where: {
      stockCode: { in: codes },
      tradeDate: { gte: historySince, lte: tradeDate },
    },
    orderBy: [{ stockCode: "asc" }, { tradeDate: "desc" }],
    select: { stockCode: true, foreignRatioPct: true },
  });

  const byCode = groupRecentByCode(
    ownershipRows.map((r) => ({
      stockCode: r.stockCode,
      tradeDate,
      foreignRatioPct: r.foreignRatioPct,
      foreignShares: null,
      listedShares: null,
    })),
    HISTORY_DAYS,
  );

  const map = new Map<string, number[]>();
  for (const code of codes) {
    map.set(code, buildRatioHistory60d(byCode.get(code) ?? []));
  }
  return map;
}

function toStreakEntry(
  row: {
    stockCode: string;
    change1d: number;
    change5d: number;
    change20d: number;
    change60d: number;
    foreignRatioPercentile: number | null;
    stock: {
      code: string;
      name: string;
      market: string;
      sector: string | null;
      ownership: { foreignRatioPct: number }[];
    };
  },
  streakDays: number,
  tradeDate: string,
  ratioHistory60d: number[],
): ConsecutiveInflowEntry {
  const change1d = row.change1d ?? 0;
  const change60d = row.change60d ?? 0;
  return {
    code: row.stock.code,
    name: row.stock.name,
    market: row.stock.market,
    sector: row.stock.sector,
    currentRatio: row.stock.ownership[0]?.foreignRatioPct ?? 0,
    change1d,
    change5d: row.change5d ?? 0,
    change20d: row.change20d ?? 0,
    change60d,
    foreignRatioPercentile: row.foreignRatioPercentile,
    lastTradeDate: tradeDate,
    absChange1d: Math.abs(change1d),
    absChange60d: Math.abs(change60d),
    marketCap: 0,
    closePrice: 0,
    priceChange1d: 0,
    priceChange60d: 0,
    volume: 0,
    ratioHistory60d,
    consecutiveUpDays: streakDays,
    inference: EMPTY_INFERENCE,
    streakDays,
  };
}

export async function getConsecutiveInflowTop(
  market: MarketFilter = "ALL",
  limit = 10,
  minStreak = 3,
): Promise<ConsecutiveInflowEntry[]> {
  const { inflow } = await getConsecutiveStreakTops(market, limit, minStreak);
  return inflow;
}
