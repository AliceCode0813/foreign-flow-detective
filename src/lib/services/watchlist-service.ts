import { prisma } from "@/lib/db";
import type { StockSummary } from "@/lib/types";
import { getLatestTradeDate } from "./stock-service";

/** 즐겨찾기 종목 코드 목록 */
export async function listWatchlistCodes(): Promise<string[]> {
  try {
    const rows = await prisma.watchlist.findMany({
      orderBy: { createdAt: "asc" },
      select: { stockCode: true },
    });
    return rows.map((r) => r.stockCode);
  } catch {
    return [];
  }
}

/** 코드가 즐겨찾기인지 */
export async function isWatchlisted(code: string): Promise<boolean> {
  try {
    const row = await prisma.watchlist.findUnique({ where: { stockCode: code } });
    return !!row;
  } catch {
    return false;
  }
}

/** 즐겨찾기 종목 요약 — 지분 데이터 없어도 목록에 표시 */
export async function getWatchlistStocks(): Promise<StockSummary[]> {
  try {
    const latestTradeDate = await getLatestTradeDate();

    const rows = await prisma.watchlist.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        stock: {
          select: {
            code: true,
            name: true,
            market: true,
            sector: true,
            ownership: latestTradeDate
              ? { where: { tradeDate: latestTradeDate }, take: 1, select: { foreignRatioPct: true } }
              : { take: 0, select: { foreignRatioPct: true } },
            rankings: latestTradeDate
              ? {
                  where: { tradeDate: latestTradeDate },
                  take: 1,
                  select: {
                    change1d: true,
                    change5d: true,
                    change20d: true,
                    change60d: true,
                    foreignRatioPercentile: true,
                  },
                }
              : {
                  take: 0,
                  select: {
                    change1d: true,
                    change5d: true,
                    change20d: true,
                    change60d: true,
                    foreignRatioPercentile: true,
                  },
                },
          },
        },
      },
    });

    return rows.map((r) => ({
      code: r.stock.code,
      name: r.stock.name,
      market: r.stock.market,
      sector: r.stock.sector,
      currentRatio: r.stock.ownership[0]?.foreignRatioPct ?? 0,
      change1d: r.stock.rankings[0]?.change1d ?? 0,
      change5d: r.stock.rankings[0]?.change5d ?? 0,
      change20d: r.stock.rankings[0]?.change20d ?? 0,
      change60d: r.stock.rankings[0]?.change60d ?? 0,
      foreignRatioPercentile: r.stock.rankings[0]?.foreignRatioPercentile ?? null,
      lastTradeDate: latestTradeDate ?? "-",
    }));
  } catch (error) {
    console.error("[watchlist-service]", error);
    return [];
  }
}

/** 즐겨찾기 추가 — stocks에 없으면 안내 (sync_stocks.py 먼저 실행) */
export async function addToWatchlist(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const stock = await prisma.stock.findUnique({ where: { code } });
    if (!stock) {
      return {
        ok: false,
        error:
          "아직 DB에 없는 종목입니다. 터미널에서 py scripts/sync_stocks.py 실행 후 다시 시도하세요.",
      };
    }

    await prisma.watchlist.upsert({
      where: { stockCode: code },
      create: { stockCode: code },
      update: {},
    });
    return { ok: true };
  } catch (error) {
    console.error("[watchlist-service]", error);
    return { ok: false, error: "즐겨찾기 추가 실패 — 서버를 재시작해 보세요." };
  }
}

/** 즐겨찾기 제거 */
export async function removeFromWatchlist(code: string): Promise<{ ok: boolean }> {
  try {
    await prisma.watchlist.deleteMany({ where: { stockCode: code } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
