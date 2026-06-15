/**
 * 알림 엔진 (Priority 5)
 *
 * 조건:
 * 1. CHANGE_60D_05 — 60일 지분율 +0.5%p 이상 증가
 * 2. STREAK_5D     — 5거래일 연속 지분율 증가
 * 3. NEW_HIGH      — 외국인 지분율 역대(수집 구간) 최고치 갱신
 *
 * ingest 또는 evaluate_alerts.py 실행 후 alerts 테이블에 적재
 */

import { prisma } from "@/lib/db";
import { ALERT_TYPES, type AlertRecord, type AlertType } from "@/lib/types";

export { ALERT_TYPES };

interface OwnershipPoint {
  tradeDate: string;
  foreignRatioPct: number;
}

/** 60일 +0.5%p 이상 */
export function checkChange60d(
  rows: OwnershipPoint[],
  ranking60d: number,
): { triggered: boolean; message: string } {
  if (ranking60d >= 0.5) {
    return {
      triggered: true,
      message: `60일 외국인 지분율 +${ranking60d.toFixed(2)}%p 증가 (기준: +0.5%p)`,
    };
  }
  return { triggered: false, message: "" };
}

/** 5거래일 연속 증가 */
export function checkStreak5d(rows: OwnershipPoint[]): {
  triggered: boolean;
  message: string;
} {
  if (rows.length < 6) return { triggered: false, message: "" };

  const tail = rows.slice(-6);
  let streak = 0;
  for (let i = 1; i < tail.length; i++) {
    if (tail[i].foreignRatioPct > tail[i - 1].foreignRatioPct) {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 5) {
    return {
      triggered: true,
      message: `5거래일 연속 외국인 지분율 증가 (최신 ${tail[tail.length - 1].foreignRatioPct.toFixed(2)}%)`,
    };
  }
  return { triggered: false, message: "" };
}

/** 수집 구간 최고치 갱신 */
export function checkNewHigh(rows: OwnershipPoint[]): {
  triggered: boolean;
  message: string;
} {
  if (rows.length < 2) return { triggered: false, message: "" };

  const latest = rows[rows.length - 1];
  const prevMax = Math.max(
    ...rows.slice(0, -1).map((r) => r.foreignRatioPct),
  );

  if (latest.foreignRatioPct > prevMax) {
    return {
      triggered: true,
      message: `외국인 지분율 최고치 갱신 ${latest.foreignRatioPct.toFixed(2)}% (이전 최고 ${prevMax.toFixed(2)}%)`,
    };
  }
  return { triggered: false, message: "" };
}

/** 단일 종목 알림 평가 → DB upsert */
export async function evaluateStockAlerts(stockCode: string): Promise<number> {
  const rows = await prisma.foreignOwnershipDaily.findMany({
    where: { stockCode },
    orderBy: { tradeDate: "asc" },
    select: { tradeDate: true, foreignRatioPct: true },
  });

  if (rows.length === 0) return 0;

  const latestDate = rows[rows.length - 1].tradeDate;
  const ranking = await prisma.rankingDaily.findUnique({
    where: {
      stockCode_tradeDate: { stockCode, tradeDate: latestDate },
    },
  });

  const checks: { type: AlertType; result: { triggered: boolean; message: string } }[] = [
    {
      type: ALERT_TYPES.CHANGE_60D_05,
      result: checkChange60d(rows, ranking?.change60d ?? 0),
    },
    { type: ALERT_TYPES.STREAK_5D, result: checkStreak5d(rows) },
    { type: ALERT_TYPES.NEW_HIGH, result: checkNewHigh(rows) },
  ];

  let created = 0;
  for (const { type, result } of checks) {
    if (!result.triggered) continue;

    const existing = await prisma.alert.findFirst({
      where: { stockCode, alertType: type, tradeDate: latestDate },
    });

    if (!existing) {
      await prisma.alert.create({
        data: {
          stockCode,
          alertType: type,
          message: result.message,
          tradeDate: latestDate,
          severity: type === ALERT_TYPES.CHANGE_60D_05 ? "warning" : "info",
          payload: { change60d: ranking?.change60d },
        },
      });
      created++;
    }
  }

  return created;
}

/** 최근 알림 목록 */
export async function listRecentAlerts(limit = 20): Promise<AlertRecord[]> {
  try {
    const rows = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { stock: { select: { name: true } } },
    });

    return rows.map((r) => ({
      id: r.id,
      stockCode: r.stockCode,
      stockName: r.stock.name,
      alertType: r.alertType as AlertType,
      message: r.message,
      tradeDate: r.tradeDate,
      severity: r.severity,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
