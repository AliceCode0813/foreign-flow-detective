/** 랭킹·변화율 기간 키 */
export type RankingPeriod = "1d" | "5d" | "20d" | "60d";

/** 시장 필터: 코스피 / 코스닥 / 전체 */
export type MarketFilter = "KOSPI" | "KOSDAQ" | "ALL";

/** 종목 요약 (대시보드·목록) */
export interface StockSummary {
  code: string;
  name: string;
  market: string;
  sector: string | null;
  currentRatio: number;
  change1d: number;
  change5d: number;
  change20d: number;
  change60d: number;
  foreignRatioPercentile: number | null;
  lastTradeDate: string;
}

/** 규칙 기반 지분 변동 추정 */
export interface OwnershipInference {
  tags: string[];
  summary: string;
  method: "rule";
}

/** 정렬 키 — 지분 변동 탐색 */
export type MoverSortKey = "volatility" | "marketcap" | "price" | "change60d";

/** 60일 지분 비율 스파크라인 포인트 */
export type RatioSparkline = number[];

/** 지분 변동 + 시총·주가·추정 */
export interface OwnershipMoverRow extends StockSummary {
  absChange1d: number;
  absChange60d: number;
  marketCap: number;
  closePrice: number;
  priceChange1d: number;
  priceChange60d: number;
  volume: number;
  ratioHistory60d: RatioSparkline;
  consecutiveUpDays: number;
  inference: OwnershipInference;
}

/** 산점도 포인트 */
export interface CorrelationPoint {
  code: string;
  name: string;
  change60d: number;
  priceChange60d: number;
  marketCap: number;
}

/** 섹터(시장) 히트맵 셀 */
export interface SectorHeatmapCell {
  label: string;
  count: number;
  avgChange60d: number;
}

/** 연속 유입 종목 */
export interface ConsecutiveInflowEntry extends OwnershipMoverRow {
  streakDays: number;
}

/** 종목 상세 */
export interface StockDetail extends StockSummary {
  /** 수집 시작일 대비 최신 지분율 변화 (%p) */
  changeAll: number;
  overview: string | null;
  marketCap: number;
  closePrice: number;
  changePct: number;
}

/** 외국인 지분 일별 이력 */
export interface OwnershipHistoryPoint {
  date: string;
  foreignRatioPct: number;
  foreignShares: string | null;
  listedShares: string | null;
}

/** 시세 일별 이력 (차트용) */
export interface MarketHistoryPoint {
  date: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: string;
  changePct: number;
}

/** 투자 정보 스냅샷 (DB 사전 수집) */
export interface StockInvestmentInfo {
  tradeDate: string;
  marketCap: number;
  listedShares: number;
  tradingValue: number | null;
  closePrice: number;
  changePct: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  divYield: number | null;
  dps: number | null;
  parValue: number | null;
}

/** 차트+표 통합 행 */
export interface CombinedHistoryRow {
  date: string;
  foreignRatioPct: number;
  foreignShares: string | null;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  closePrice: number | null;
  volume: string | null;
  changePct: number | null;
}

/** 기간별 변화율 카드 */
export interface PeriodChange {
  period: RankingPeriod | "all";
  label: string;
  changePct: number;
}

/** 랭킹 항목 */
export interface RankingEntry {
  rank: number;
  code: string;
  name: string;
  market: string;
  currentRatio: number;
  change: number;
  foreignRatioPercentile: number | null;
  tradeDate: string;
}

/** 대시보드 통계 */
export interface DashboardStats {
  trackedCount: number;
  kospiCount: number;
  kosdaqCount: number;
  avgChange1d: number;
  avgChange5d: number;
  avgChange20d: number;
  avgChange60d: number;
  lastUpdated: string;
  hasData: boolean;
}

/** 알림 유형 (Priority 5) */
export const ALERT_TYPES = {
  CHANGE_60D_05: "CHANGE_60D_05",
  STREAK_5D: "STREAK_5D",
  NEW_HIGH: "NEW_HIGH",
} as const;

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];

export interface AlertRecord {
  id: string;
  stockCode: string;
  stockName: string;
  alertType: AlertType;
  message: string;
  tradeDate: string;
  severity: string;
  createdAt: string;
}
