import { NextResponse } from "next/server";
import {
  buildPeriodChanges,
  getStockDetail,
} from "@/lib/services/stock-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/** GET /api/stocks/[code] — 종목 상세 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { code } = await params;
  const stock = await getStockDetail(code);

  if (!stock) {
    return NextResponse.json(
      { error: "종목을 찾을 수 없거나 데이터가 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    stock,
    periodChanges: buildPeriodChanges(stock),
  });
}
