import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { marketWhereClause } from "@/lib/market";
import {
  bigintToString,
  calcAllPeriodChange,
  calcPeriodChange,
  type RatioRow,
} from "@/lib/calculations";
import type {
  CombinedHistoryRow,
  DashboardStats,
  MarketFilter,
  MarketHistoryPoint,
  OwnershipHistoryPoint,
  PeriodChange,
  StockDetail,
  StockInvestmentInfo,
  StockSummary,
} from "@/lib/types";

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[stock-service]", error);
    return fallback;
  }
}

function mapSummary(
  s: {
    code: string;
    name: string;
    market: string;
    sector: string | null;
    ownership: { foreignRatioPct: number }[];
    rankings: {
      change1d: number;
      change10d: number;
      change30d: number;
      change60d: number;
    }[];
  },
  latestTradeDate: string,
): StockSummary | null {
  if (s.ownership.length === 0) return null;
  const r = s.rankings[0];
  return {
    code: s.code,
    name: s.name,
    market: s.market,
    sector: s.sector,
    currentRatio: s.ownership[0].foreignRatioPct,
    change1d: r?.change1d ?? 0,
    change10d: r?.change10d ?? 0,
    change30d: r?.change30d ?? 0,
    change60d: r?.change60d ?? 0,
    lastTradeDate: latestTradeDate,
  };
}

async function fetchLatestTradeDate(): Promise<string | null> {
  return safeQuery(async () => {
    const row = await prisma.foreignOwnershipDaily.findFirst({
      orderBy: { tradeDate: "desc" },
      select: { tradeDate: true },
    });
    return row?.tradeDate ?? null;
  }, null);
}

export const getLatestTradeDate = unstable_cache(
  fetchLatestTradeDate,
  ["latest-trade-date"],
  { revalidate: 300 },
);

export async function listStocks(
  market: MarketFilter = "ALL",
): Promise<StockSummary[]> {
  return safeQuery(async () => {
    const latestTradeDate = await getLatestTradeDate();
    if (!latestTradeDate) return [];

    const stocks = await prisma.stock.findMany({
      where: marketWhereClause(market),
      orderBy: { name: "asc" },
      include: {
        ownership: { where: { tradeDate: latestTradeDate }, take: 1 },
        rankings: { where: { tradeDate: latestTradeDate }, take: 1 },
      },
    });

    return stocks
      .map((s) => mapSummary(s, latestTradeDate))
      .filter((s): s is StockSummary => s !== null);
  }, []);
}

export async function searchStocks(
  query: string,
  market: MarketFilter = "ALL",
  limit = 50,
): Promise<StockSummary[]> {
  const q = query.trim();
  const latestTradeDate = await getLatestTradeDate();

  return safeQuery(async () => {
    const stocks = await prisma.stock.findMany({
      where: {
        ...marketWhereClause(market),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: limit,
      include: {
        ownership: latestTradeDate
          ? { where: { tradeDate: latestTradeDate }, take: 1 }
          : { take: 0 },
        rankings: latestTradeDate
          ? { where: { tradeDate: latestTradeDate }, take: 1 }
          : { take: 0 },
      },
    });

    return stocks.map((s) => ({
      code: s.code,
      name: s.name,
      market: s.market,
      sector: s.sector,
      currentRatio: s.ownership[0]?.foreignRatioPct ?? 0,
      change1d: s.rankings[0]?.change1d ?? 0,
      change10d: s.rankings[0]?.change10d ?? 0,
      change30d: s.rankings[0]?.change30d ?? 0,
      change60d: s.rankings[0]?.change60d ?? 0,
      lastTradeDate: latestTradeDate ?? "-",
    }));
  }, []);
}

export async function getTopMovers(
  market: MarketFilter = "ALL",
  limit = 9,
): Promise<StockSummary[]> {
  return safeQuery(async () => {
    const latestTradeDate = await getLatestTradeDate();
    if (!latestTradeDate) return [];

    const rows = await prisma.rankingDaily.findMany({
      where: {
        tradeDate: latestTradeDate,
        stock: marketWhereClause(market),
      },
      include: {
        stock: {
          include: {
            ownership: { where: { tradeDate: latestTradeDate }, take: 1 },
          },
        },
      },
      orderBy: { change10d: "desc" },
      take: limit,
    });

    return rows
      .filter((r) => r.stock.ownership.length > 0)
      .map((r) => ({
        code: r.stockCode,
        name: r.stock.name,
        market: r.stock.market,
        sector: r.stock.sector,
        currentRatio: r.stock.ownership[0].foreignRatioPct,
        change1d: r.change1d ?? 0,
        change10d: r.change10d ?? 0,
        change30d: r.change30d ?? 0,
        change60d: r.change60d ?? 0,
        lastTradeDate: latestTradeDate,
      }));
  }, []);
}

export async function getStockDetail(code: string): Promise<StockDetail | null> {
  return safeQuery(async () => {
    const stock = await prisma.stock.findUnique({ where: { code } });
    if (!stock) return null;

    const ownershipRows = await prisma.foreignOwnershipDaily.findMany({
      where: { stockCode: code },
      orderBy: { tradeDate: "asc" },
    });

    if (ownershipRows.length === 0) return null;

    const ratioRows: RatioRow[] = ownershipRows.map((r) => ({
      tradeDate: r.tradeDate,
      foreignRatioPct: r.foreignRatioPct,
    }));

    const latest = ownershipRows[ownershipRows.length - 1];
    const ranking = await prisma.rankingDaily.findUnique({
      where: {
        stockCode_tradeDate: { stockCode: code, tradeDate: latest.tradeDate },
      },
    });

    const [fundamental, marketRow] = await Promise.all([
      prisma.stockFundamentalDaily.findUnique({
        where: {
          stockCode_tradeDate: { stockCode: code, tradeDate: latest.tradeDate },
        },
      }),
      prisma.stockMarketDaily.findUnique({
        where: {
          stockCode_tradeDate: { stockCode: code, tradeDate: latest.tradeDate },
        },
      }),
    ]);

    const marketCap = fundamental
      ? Number(fundamental.marketCap)
      : marketRow && latest.listedShares
        ? marketRow.closePrice * Number(latest.listedShares)
        : 0;

    return {
      code: stock.code,
      name: stock.name,
      market: stock.market,
      sector: stock.sector,
      currentRatio: latest.foreignRatioPct,
      change1d: ranking?.change1d ?? calcPeriodChange(ratioRows, 1),
      change10d: ranking?.change10d ?? calcPeriodChange(ratioRows, 10),
      change30d: ranking?.change30d ?? calcPeriodChange(ratioRows, 30),
      change60d: ranking?.change60d ?? calcPeriodChange(ratioRows, 60),
      changeAll: calcAllPeriodChange(ratioRows),
      lastTradeDate: latest.tradeDate,
      marketCap,
      closePrice: marketRow?.closePrice ?? 0,
      changePct: marketRow?.changePct ?? 0,
    };
  }, null);
}

export async function getStockHistory(
  code: string,
  days = 90,
): Promise<{
  ownership: OwnershipHistoryPoint[];
  market: MarketHistoryPoint[];
}> {
  return safeQuery(
    async () => {
      const ownership = await prisma.foreignOwnershipDaily.findMany({
        where: { stockCode: code },
        orderBy: { tradeDate: "desc" },
        take: days,
      });

      const market = await prisma.stockMarketDaily.findMany({
        where: { stockCode: code },
        orderBy: { tradeDate: "desc" },
        take: days,
      });

      return {
        ownership: ownership.reverse().map((r) => ({
          date: r.tradeDate,
          foreignRatioPct: r.foreignRatioPct,
          foreignShares: bigintToString(r.foreignShares),
          listedShares: bigintToString(r.listedShares),
        })),
        market: market.reverse().map((r) => ({
          date: r.tradeDate,
          openPrice: r.openPrice,
          highPrice: r.highPrice,
          lowPrice: r.lowPrice,
          closePrice: r.closePrice,
          volume: bigintToString(r.volume) ?? "0",
          changePct: r.changePct,
        })),
      };
    },
    { ownership: [], market: [] },
  );
}

export async function getStockInvestmentInfo(
  code: string,
): Promise<StockInvestmentInfo | null> {
  return safeQuery(async () => {
    const latestOwn = await prisma.foreignOwnershipDaily.findFirst({
      where: { stockCode: code },
      orderBy: { tradeDate: "desc" },
    });
    if (!latestOwn) return null;

    const tradeDate = latestOwn.tradeDate;
    const [fundamental, market] = await Promise.all([
      prisma.stockFundamentalDaily.findUnique({
        where: { stockCode_tradeDate: { stockCode: code, tradeDate } },
      }),
      prisma.stockMarketDaily.findUnique({
        where: { stockCode_tradeDate: { stockCode: code, tradeDate } },
      }),
    ]);

    const listedShares = fundamental
      ? Number(fundamental.listedShares)
      : Number(latestOwn.listedShares ?? 0);
    const closePrice = market?.closePrice ?? 0;
    const marketCap = fundamental
      ? Number(fundamental.marketCap)
      : closePrice * listedShares;

    return {
      tradeDate,
      marketCap,
      listedShares,
      tradingValue: fundamental?.tradingValue ? Number(fundamental.tradingValue) : null,
      closePrice,
      changePct: market?.changePct ?? 0,
      per: fundamental?.per ?? null,
      pbr: fundamental?.pbr ?? null,
      eps: fundamental?.eps ?? null,
      bps: fundamental?.bps ?? null,
      divYield: fundamental?.divYield ?? null,
      dps: fundamental?.dps ?? null,
      parValue: null,
    };
  }, null);
}

export function buildCombinedHistory(
  ownership: OwnershipHistoryPoint[],
  market: MarketHistoryPoint[],
): CombinedHistoryRow[] {
  const marketMap = new Map(market.map((m) => [m.date, m]));
  return ownership.map((o) => {
    const m = marketMap.get(o.date);
    return {
      date: o.date,
      foreignRatioPct: o.foreignRatioPct,
      foreignShares: o.foreignShares,
      openPrice: m?.openPrice ?? null,
      highPrice: m?.highPrice ?? null,
      lowPrice: m?.lowPrice ?? null,
      closePrice: m?.closePrice ?? null,
      volume: m?.volume ?? null,
      changePct: m?.changePct ?? null,
    };
  });
}

export function buildPeriodChanges(detail: StockDetail): PeriodChange[] {
  return [
    { period: "1d", label: "1일", changePct: detail.change1d },
    { period: "10d", label: "10일", changePct: detail.change10d },
    { period: "30d", label: "30일", changePct: detail.change30d },
    { period: "60d", label: "60일", changePct: detail.change60d },
    { period: "all", label: "전체", changePct: detail.changeAll },
  ];
}

export async function getDashboardStats(
  market: MarketFilter = "ALL",
): Promise<DashboardStats> {
  return safeQuery(
    async () => {
      const latestTradeDate = await getLatestTradeDate();

      const [kospiCount, kosdaqCount, trackedCount, avgAgg] = await Promise.all([
        prisma.stock.count({ where: { market: "KOSPI" } }),
        prisma.stock.count({ where: { market: "KOSDAQ" } }),
        latestTradeDate
          ? prisma.rankingDaily.count({
              where: {
                tradeDate: latestTradeDate,
                stock: marketWhereClause(market),
              },
            })
          : Promise.resolve(0),
        latestTradeDate
          ? prisma.rankingDaily.aggregate({
              where: {
                tradeDate: latestTradeDate,
                stock: marketWhereClause(market),
              },
              _avg: {
                change1d: true,
                change10d: true,
                change30d: true,
                change60d: true,
              },
            })
          : Promise.resolve(null),
      ]);

      if (!latestTradeDate || trackedCount === 0) {
        return {
          trackedCount: 0,
          kospiCount,
          kosdaqCount,
          avgChange1d: 0,
          avgChange10d: 0,
          avgChange30d: 0,
          avgChange60d: 0,
          lastUpdated: "데이터 없음 — ingest 실행",
          hasData: false,
        };
      }

      const round = (v: number | null | undefined) =>
        Math.round((v ?? 0) * 100) / 100;

      return {
        trackedCount,
        kospiCount,
        kosdaqCount,
        avgChange1d: round(avgAgg?._avg.change1d),
        avgChange10d: round(avgAgg?._avg.change10d),
        avgChange30d: round(avgAgg?._avg.change30d),
        avgChange60d: round(avgAgg?._avg.change60d),
        lastUpdated: `${latestTradeDate} (KRX/pykrx)`,
        hasData: true,
      };
    },
    {
      trackedCount: 0,
      kospiCount: 0,
      kosdaqCount: 0,
      avgChange1d: 0,
      avgChange10d: 0,
      avgChange30d: 0,
      avgChange60d: 0,
      lastUpdated: "DB 연결 실패",
      hasData: false,
    },
  );
}
