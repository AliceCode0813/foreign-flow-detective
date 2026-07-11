import { NextRequest, NextResponse } from "next/server";
import { parseMarketFilter } from "@/lib/market";
import { getRankings } from "@/lib/services/ranking-service";
import type { RankingPeriod } from "@/lib/types";

export const revalidate = 300;

const VALID_PERIODS: RankingPeriod[] = ["1d", "5d", "20d", "60d"];

/** GET /api/rankings?period=60d&limit=10&market=KOSPI */
export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get("period") ?? "60d";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const market = parseMarketFilter(request.nextUrl.searchParams.get("market"));

  const period = VALID_PERIODS.includes(periodParam as RankingPeriod)
    ? (periodParam as RankingPeriod)
    : "60d";

  const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 50) : 10;
  const { entries, tradeDate } = await getRankings(period, limit, market);

  return NextResponse.json(
    { period, market, tradeDate, entries },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
