"use client";

import Link from "next/link";
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

  return (
    <div className="flex flex-wrap gap-2">
      {MARKET_FILTERS.map((tab) => (
        <Link
          key={tab.key}
          href={hrefFor(tab.key)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            current === tab.key
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
