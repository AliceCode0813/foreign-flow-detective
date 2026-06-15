import type { RankingPeriod } from "./types";

export function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatRatio(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** 지분율 변화 (%p) */
export function formatChange(value: number | null | undefined): string {
  const n = value ?? 0;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%p`;
}

export function formatPercent(value: number | null | undefined): string {
  const n = value ?? 0;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** 시가총액 (원) */
export function formatMarketCap(krw: number): string {
  if (krw <= 0) return "-";
  if (krw >= 1_0000_0000_0000) return `${(krw / 1_0000_0000_0000).toFixed(2)}조`;
  if (krw >= 100_000_000) return `${Math.round(krw / 100_000_000).toLocaleString("ko-KR")}억`;
  return `${Math.round(krw / 10_000).toLocaleString("ko-KR")}만`;
}

export function formatPrice(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function formatVolume(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("ko-KR");
}

export const PERIOD_LABELS: Record<RankingPeriod | "all", string> = {
  "1d": "1일",
  "10d": "10일",
  "30d": "30일",
  "60d": "60일",
  all: "전체",
};

export function changeColor(value: number): string {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-slate-500 dark:text-slate-400";
}

export function changeBg(value: number): string {
  if (value > 0)
    return "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900";
  if (value < 0)
    return "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900";
  return "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700";
}
