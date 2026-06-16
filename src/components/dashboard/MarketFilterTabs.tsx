"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { MARKET_FILTERS } from "@/lib/market";
import type { MarketFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 코스피 / 코스닥 / 전체 시장 필터 탭 */
export function MarketFilterTabs({ current }: { current: MarketFilter }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(market: MarketFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (market === "ALL") {
      params.delete("market");
    } else {
      params.set("market", market);
    }
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  function exploreHref() {
    if (current === "ALL") return "/explore";
    return `/explore?market=${current}`;
  }

  const onExplore = pathname === "/explore";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {MARKET_FILTERS.map((tab) => (
        <Link
          key={tab.key}
          href={hrefFor(tab.key)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            !onExplore && current === tab.key
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : onExplore && current === tab.key
                ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800",
          )}
        >
          {tab.label}
        </Link>
      ))}

      {!onExplore && (
        <Link
          href={exploreHref()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-900 dark:hover:bg-blue-950/40"
        >
          <Compass className="h-3.5 w-3.5" />
          지분 탐색
        </Link>
      )}
    </div>
  );
}
