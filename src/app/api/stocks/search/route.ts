import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { searchStocks } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

/** GET /api/stocks/search?q=삼성&market=KOSPI */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const market = parseMarketFilter(request.nextUrl.searchParams.get("market"));
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 50;
  const stocks = await searchStocks(q, market, limit);

  return NextResponse.json({ stocks, market, query: q });
}
