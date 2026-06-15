import { NextRequest, NextResponse } from "next/server";
import { getStockHistory } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/** GET /api/stocks/[code]/history?days=90 — 지분·시세 이력 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = await params;
  const days = Number(request.nextUrl.searchParams.get("days") ?? "90");

  const history = await getStockHistory(code, Number.isFinite(days) ? days : 90);

  if (history.ownership.length === 0) {
    return NextResponse.json(
      { error: "이력 데이터가 없습니다. ingest를 실행하세요." },
      { status: 404 },
    );
  }

  return NextResponse.json(history);
}
