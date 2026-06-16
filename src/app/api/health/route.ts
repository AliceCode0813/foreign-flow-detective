import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function databaseHostHint(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url.replace(/^postgresql:\/\//, "http://"));
    return parsed.host;
  } catch {
    return "invalid-url";
  }
}

/** GET /api/health — DB 연결 진단 (Vercel 배포 확인용) */
export async function GET() {
  const databaseUrlSet = Boolean(process.env.DATABASE_URL?.trim());

  if (!databaseUrlSet) {
    return NextResponse.json({
      ok: false,
      databaseUrlSet: false,
      databaseHostHint: null,
      stockCount: 0,
      error: "DATABASE_URL 환경변수가 없습니다.",
    });
  }

  try {
    const stockCount = await prisma.stock.count();
    return NextResponse.json({
      ok: stockCount > 0,
      databaseUrlSet: true,
      databaseHostHint: databaseHostHint(),
      stockCount,
      error: stockCount > 0 ? null : "DB 연결은 됐지만 stocks 테이블이 비어 있습니다.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({
      ok: false,
      databaseUrlSet: true,
      databaseHostHint: databaseHostHint(),
      stockCount: 0,
      error: message,
    });
  }
}
