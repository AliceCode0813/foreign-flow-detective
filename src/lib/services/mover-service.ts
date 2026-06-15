import { prisma } from "@/lib/db";
import { inferOwnershipChange } from "@/lib/inference";
import { marketWhereClause } from "@/lib/market";
import type { MarketFilter, OwnershipMoverRow } from "@/lib/types";
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
): Promise<OwnershipMoverRow[]> {
  const tradeDate = await getLatestTradeDate();
  if (!tradeDate) return [];

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
        where: { stockCode: { in: codes } },
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
        where: { stockCode: { in: codes } },
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
  const movers = await getOwnershipMovers(market);
  return movers
    .filter((m) => m.absChange1d > 0)
    .sort((a, b) => b.absChange1d - a.absChange1d)
    .slice(0, limit);
}
