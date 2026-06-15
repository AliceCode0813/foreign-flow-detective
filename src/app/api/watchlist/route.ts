import { NextResponse } from "next/server";
import {
  addToWatchlist,
  getWatchlistStocks,
  listWatchlistCodes,
} from "@/lib/services/watchlist-service";

export const dynamic = "force-dynamic";

/** GET /api/watchlist — 즐겨찾기 목록 */
export async function GET() {
  const [stocks, codes] = await Promise.all([
    getWatchlistStocks(),
    listWatchlistCodes(),
  ]);
  return NextResponse.json({ stocks, codes, count: stocks.length });
}

/** POST /api/watchlist — 즐겨찾기 추가 { "code": "005930" } */
export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim();

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "유효한 6자리 종목코드가 필요합니다." }, { status: 400 });
  }

  const result = await addToWatchlist(code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, code });
}
