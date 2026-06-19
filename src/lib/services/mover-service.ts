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
/** 쿼리·응답 절약용 캘린더 버퍼 (거래일 60 + 여유) */
const HISTORY_CALENDAR_BUFFER = 95;
const DEFAULT_SPARKLINE_TOP = 120;

export interface GetOwnershipMoversOptions {
  /** ratioHistory60d 를 포함할 상위 종목 수 (0 = 전부 제외) */
  sparklineTop?: number;
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

/** 최근 N거래일 연속 지분 증가 일수 */
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
    change10d: number;
    change30d: number;
    change60d: number;
  },
  ownership: RecentOwnership[],
  market: RecentMarket[],
  tradeDate: string,
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
  const ratioHistory60d = buildRatioHistory60d(ownership);

  return {
    code: stock.code,
    name: stock.name,
    market: stock.market,
    sector: stock.sector,
    currentRatio: latestOwn.foreignRatioPct,
    change1d,
    change10d: ranking.change10d ?? 0,
    change30d: ranking.change30d ?? 0,
    change60d,
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
  const historySince = subtractCalendarDays(tradeDate, HISTORY_CALENDAR_BUFFER);

  try {
    const rankings = await prisma.rankingDaily.findMany({
      where: {
        tradeDate,
        stock: marketWhereClause(market),
      },
      include: { stock: true },
    });

    if (rankings.length === 0) return [];

    const codes = rankings.map((r) => r.stockCode);

    const [ownershipRows, marketRows] = await Promise.all([
      prisma.foreignOwnershipDaily.findMany({
        where: {
          stockCode: { in: codes },
          tradeDate: { gte: historySince, lte: tradeDate },
        },
        orderBy: [{ stockCode: "asc" }, { tradeDate: "desc" }],
        select: {
          stockCode: true,
          tradeDate: true,
          foreignRatioPct: true,
          foreignShares: true,
          listedShares: true,
        },
      }),
      prisma.stockMarketDaily.findMany({
        where: {
          stockCode: { in: codes },
          tradeDate: { gte: historySince, lte: tradeDate },
        },
        orderBy: [{ stockCode: "asc" }, { tradeDate: "desc" }],
        select: {
          stockCode: true,
          tradeDate: true,
          closePrice: true,
          volume: true,
        },
      }),
    ]);

    const ownershipByCode = groupRecentByCode(ownershipRows, HISTORY_DAYS);
    const marketByCode = groupRecentByCode(marketRows, HISTORY_DAYS);

    const movers: OwnershipMoverRow[] = [];
    for (const row of rankings) {
      const built = buildMoverRow(
        row.stock,
        row,
        ownershipByCode.get(row.stockCode) ?? [],
        marketByCode.get(row.stockCode) ?? [],
        tradeDate,
      );
      if (built) movers.push(built);
    }

    if (sparklineTop <= 0) {
      return movers.map((m) => ({ ...m, ratioHistory60d: [] }));
    }

    const sparklineCodes = new Set(
      [...movers]
        .sort((a, b) => b.absChange60d - a.absChange60d)
        .slice(0, sparklineTop)
        .map((m) => m.code),
    );

    return movers.map((m) =>
      sparklineCodes.has(m.code) ? m : { ...m, ratioHistory60d: [] },
    );
  } catch (error) {
    console.error("[mover-service]", error);
    return [];
  }
}

export async function getDailyVolatilityTop(
  market: MarketFilter = "ALL",
  limit = 10,
): Promise<OwnershipMoverRow[]> {
  const movers = await getOwnershipMovers(market);
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

/** 연속 유입/유출 TOP N — ingest 시 저장한 streak 컬럼 조회 (경량) */
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
    ["consecutive-streak", market, String(limit), String(minStreak)],
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
    const [inflowRows, outflowRows] = await Promise.all([
      prisma.rankingDaily.findMany({
        where: {
          tradeDate,
          consecutiveUpDays: { gte: minStreak },
          stock: marketFilter,
        },
        orderBy: [{ consecutiveUpDays: "desc" }, { change60d: "desc" }],
        take: limit,
        include: {
          stock: {
            include: {
              ownership: { where: { tradeDate }, take: 1 },
            },
          },
        },
      }),
      prisma.rankingDaily.findMany({
        where: {
          tradeDate,
          consecutiveDownDays: { gte: minStreak },
          stock: marketFilter,
        },
        orderBy: [{ consecutiveDownDays: "desc" }, { change60d: "asc" }],
        take: limit,
        include: {
          stock: {
            include: {
              ownership: { where: { tradeDate }, take: 1 },
            },
          },
        },
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
      tradeDate: tradeDate,
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
    change10d: number;
    change30d: number;
    change60d: number;
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
    change10d: row.change10d ?? 0,
    change30d: row.change30d ?? 0,
    change60d,
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

/** @deprecated getConsecutiveStreakTops 사용 */
export async function getConsecutiveInflowTop(
  market: MarketFilter = "ALL",
  limit = 10,
  minStreak = 3,
): Promise<ConsecutiveInflowEntry[]> {
  const { inflow } = await getConsecutiveStreakTops(market, limit, minStreak);
  return inflow;
}
