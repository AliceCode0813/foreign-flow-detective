import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getConsecutiveInflowTop } from "@/lib/services/mover-service";
import { getLatestTradeDate } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

/** GET /api/movers/consecutive?market=ALL&limit=10 — 연속 유입 TOP N (경량) */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const market = parseMarketFilter(params.get("market"));
  const limit = Math.min(20, Math.max(1, Number(params.get("limit")) || 10));

  try {
    const [entries, tradeDate] = await Promise.all([
      getConsecutiveInflowTop(market, limit),
      getLatestTradeDate(),
    ]);

    return NextResponse.json(
      { entries, tradeDate, meta: { market, limit, count: entries.length } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ entries: [], tradeDate: null, error: message }, { status: 500 });
  }
}
