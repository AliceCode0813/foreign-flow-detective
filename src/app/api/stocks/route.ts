import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getDashboardStats, listStocks } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

/** GET /api/stocks?market=KOSPI|KOSDAQ|ALL */
export async function GET(request: NextRequest) {
  const market = parseMarketFilter(request.nextUrl.searchParams.get("market"));
  const [stocks, stats] = await Promise.all([
    listStocks(market),
    getDashboardStats(market),
  ]);

  return NextResponse.json({
    stocks,
    meta: {
      market,
      count: stocks.length,
      lastUpdated: stats.lastUpdated,
      hasData: stats.hasData,
    },
  });
}
