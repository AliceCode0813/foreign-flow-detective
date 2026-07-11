import { NextRequest, NextResponse } from "next/server";
import { getStockHistory } from "@/lib/services/stock-service";

export const revalidate = 300;

interface RouteParams {
  params: Promise<{ code: string }>;
}

/** GET /api/stocks/[code]/history?days=60|all — 지분·시세 이력 (DB only) */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;
  const daysParam = request.nextUrl.searchParams.get("days") ?? "60";

  const days =
    daysParam === "all" ? ("all" as const) : Number.isFinite(Number(daysParam)) ? Number(daysParam) : 60;

  const history = await getStockHistory(code, days);

  if (history.ownership.length === 0) {
    return NextResponse.json(
      { error: "이력 데이터가 없습니다. ingest를 실행하세요." },
      { status: 404 },
    );
  }

  return NextResponse.json(history, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
