"use client";

import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { hrefWithMarketParam, MARKET_FILTERS } from "@/lib/market";
import type { MarketFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 대시보드 / 지분 탐색 + 시장(전체·코스피·코스닥) 필터 */
export function MarketFilterTabs({ current }: { current: MarketFilter }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onExplore = pathname === "/explore";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {onExplore ? (
          <Link
            href={hrefWithMarketParam("/", searchParams, "market", current)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            대시보드
          </Link>
        ) : (
          <Link
            href={hrefWithMarketParam("/explore", searchParams, "market", current)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-900 dark:hover:bg-blue-950/40"
          >
            <Compass className="h-3.5 w-3.5" />
            지분 탐색
          </Link>
        )}

        <span className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" aria-hidden />

        <div className="flex flex-wrap gap-2">
          {MARKET_FILTERS.map((tab) => {
            const href = hrefWithMarketParam(
              onExplore ? "/explore" : "/",
              searchParams,
              "market",
              tab.key,
            );
            const active = current === tab.key;

            return (
              <Link
                key={tab.key}
                href={href}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? onExplore
                      ? "bg-blue-600 text-white dark:bg-blue-500"
                      : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {onExplore && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {current === "KOSPI"
            ? "코스피"
            : current === "KOSDAQ"
              ? "코스닥"
              : "전체"}{" "}
          종목 · 60일 지분 변동 · 위 탭으로 시장 변경
        </p>
      )}
    </div>
  );
}
