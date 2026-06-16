import type { MarketFilter } from "@/lib/types";

export const MARKET_FILTERS: { key: MarketFilter; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "KOSPI", label: "코스피" },
  { key: "KOSDAQ", label: "코스닥" },
];

/** URL/API market 파라미터 정규화 */
export function parseMarketFilter(value: string | null | undefined): MarketFilter {
  const upper = value?.toUpperCase();
  if (upper === "KOSPI" || upper === "KOSDAQ") return upper;
  return "ALL";
}

/** Prisma where.market 조건 */
export function marketWhereClause(market: MarketFilter) {
  if (market === "ALL") return {};
  return { market };
}

/** ?market= 쿼리 포함 경로 (ALL이면 market 파라미터 생략) */
export function hrefWithMarket(pathname: string, market: MarketFilter): string {
  if (market === "ALL") return pathname;
  const sep = pathname.includes("?") ? "&" : "?";
  return `${pathname}${sep}market=${market}`;
}
