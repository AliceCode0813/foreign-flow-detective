import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getOwnershipMovers } from "@/lib/services/mover-service";
import { getLatestTradeDate } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/movers?market=KOSPI|KOSDAQ|ALL — 지분 변동 탐색용 (클라이언트 지연 로드) */
export async function GET(request: NextRequest) {
  const market = parseMarketFilter(request.nextUrl.searchParams.get("market"));

  try {
    const [movers, tradeDate] = await Promise.all([
      getOwnershipMovers(market, { sparklineTop: 120 }),
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
