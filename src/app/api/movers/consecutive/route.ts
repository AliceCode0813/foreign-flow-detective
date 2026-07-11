import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getConsecutiveStreakTops } from "@/lib/services/mover-service";

export const revalidate = 300;

/** GET /api/movers/consecutive?market=ALL&limit=10 — 연속 유입·유출 TOP N (DB precomputed) */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const market = parseMarketFilter(params.get("market"));
  const limit = Math.min(20, Math.max(1, Number(params.get("limit")) || 10));

  try {
    const { inflow, outflow, tradeDate } = await getConsecutiveStreakTops(market, limit);

    return NextResponse.json(
      {
        inflow,
        outflow,
        entries: inflow,
        tradeDate,
        meta: { market, limit, inflowCount: inflow.length, outflowCount: outflow.length },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { inflow: [], outflow: [], entries: [], tradeDate: null, error: message },
      { status: 500 },
    );
  }
}
