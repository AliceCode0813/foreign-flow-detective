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

export function marketFilterLabel(market: MarketFilter): string {
  if (market === "KOSPI") return "코스피";
  if (market === "KOSDAQ") return "코스닥";
  return "전체";
}

type SearchParamsInput =
  | string
  | URLSearchParams
  | { toString(): string; get?: (name: string) => string | null }
  | Record<string, string | string[] | undefined>;

function toURLSearchParams(input: SearchParamsInput): URLSearchParams {
  if (typeof input === "string") return new URLSearchParams(input);
  if (input instanceof URLSearchParams) return new URLSearchParams(input.toString());
  if (typeof input.get === "function") return new URLSearchParams(input.toString());

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  return params;
}

/** Named market query param — preserves other params (ALL omits the param). */
export function hrefWithMarketParam(
  pathname: string,
  currentSearch: SearchParamsInput,
  paramName: string,
  market: MarketFilter,
): string {
  const params = toURLSearchParams(currentSearch);
  if (market === "ALL") {
    params.delete(paramName);
  } else {
    params.set(paramName, market);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** ?market= 쿼리 포함 경로 (ALL이면 market 파라미터 생략) */
export function hrefWithMarket(pathname: string, market: MarketFilter): string {
  return hrefWithMarketParam(pathname, "", "market", market);
}
