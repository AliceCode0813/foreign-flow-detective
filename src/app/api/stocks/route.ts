import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getDashboardStats, listStocks } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

/** GET /api/stocks?market=KOSPI|KOSDAQ|ALL&limit=500 */
export async function GET(request: NextRequest) {
  const market = parseMarketFilter(request.nextUrl.searchParams.get("market"));
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 3000) : 500;

  const [stocks, stats] = await Promise.all([
    listStocks(market, limit),
    getDashboardStats(market),
  ]);

  return NextResponse.json(
    {
      stocks,
      meta: {
        market,
        count: stocks.length,
        lastUpdated: stats.lastUpdated,
        hasData: stats.hasData,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
