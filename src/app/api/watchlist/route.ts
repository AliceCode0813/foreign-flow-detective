import { NextRequest, NextResponse } from "next/server";
import { getStocksByCodes } from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

/** GET /api/watchlist?codes=005930,000660 — 브라우저 즐겨찾기 코드에 대한 종목 요약 */
export async function GET(request: NextRequest) {
  const codesParam = request.nextUrl.searchParams.get("codes")?.trim() ?? "";
  if (!codesParam) {
    return NextResponse.json({ stocks: [], codes: [] });
  }

  const codes = codesParam
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^\d{6}$/.test(c));

  if (codes.length === 0) {
    return NextResponse.json({ stocks: [], codes: [] });
  }

  if (codes.length > 100) {
    return NextResponse.json({ error: "최대 100개까지 조회할 수 있습니다." }, { status: 400 });
  }

  const stocks = await getStocksByCodes(codes);
  return NextResponse.json(
    { stocks, codes: stocks.map((s) => s.code) },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
