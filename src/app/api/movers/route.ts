import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getOwnershipMovers } from "@/lib/services/mover-service";
import { getLatestTradeDate } from "@/lib/services/stock-service";

export const revalidate = 300;
export const maxDuration = 60;

/** GET /api/movers?market=KOSPI|KOSDAQ|ALL&limit=500&sparklineTop=80 */
export async function GET(request: NextRequest) {
  const market = parseMarketFilter(request.nextUrl.searchParams.get("market"));
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "0");
  const sparklineParam = Number(request.nextUrl.searchParams.get("sparklineTop") ?? "80");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 3000) : undefined;
  const sparklineTop =
    Number.isFinite(sparklineParam) && sparklineParam >= 0 ? Math.min(sparklineParam, 200) : 80;

  try {
    const [movers, tradeDate] = await Promise.all([
      getOwnershipMovers(market, { sparklineTop, limit }),
      getLatestTradeDate(),
    ]);

    return NextResponse.json(
      {
        movers,
        tradeDate,
        meta: { market, count: movers.length },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ movers: [], tradeDate: null, error: message }, { status: 500 });
  }
}
