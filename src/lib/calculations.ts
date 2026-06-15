/**
 * 외국인 지분율 기간 변화 계산 유틸
 * - tradeDate 기준 오름차순 정렬된 ratio 배열에서 N거래일 전 대비 변화(%p) 산출
 */

export interface RatioRow {
  tradeDate: string;
  foreignRatioPct: number;
}

/** 소수 둘째 자리 반올림 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * N거래일 전 대비 지분율 변화 (%p)
 * @param rows tradeDate ASC 정렬
 * @param tradingDays 이전 거래일 오프셋 (10, 30, 60 등)
 */
export function calcPeriodChange(rows: RatioRow[], tradingDays: number): number {
  if (rows.length === 0) return 0;
  const end = rows[rows.length - 1].foreignRatioPct;
  const idx = Math.max(0, rows.length - 1 - tradingDays);
  const start = rows[idx].foreignRatioPct;
  return round2(end - start);
}

/** 수집 구간 전체 변화 (%p): 첫 거래일 → 최신 */
export function calcAllPeriodChange(rows: RatioRow[]): number {
  if (rows.length < 2) return 0;
  const start = rows[0].foreignRatioPct;
  const end = rows[rows.length - 1].foreignRatioPct;
  return round2(end - start);
}

/** BigInt → API 안전 문자열 (JS Number 정밀도 초과 방지) */
export function bigintToString(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}
