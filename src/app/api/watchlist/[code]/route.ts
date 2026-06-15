import { NextResponse } from "next/server";
import { removeFromWatchlist } from "@/lib/services/watchlist-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/** DELETE /api/watchlist/[code] */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { code } = await params;
  const result = await removeFromWatchlist(code);
  if (!result.ok) {
    return NextResponse.json({ error: "제거 실패" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, code });
}
