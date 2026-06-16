"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hrefWithMarket, MARKET_FILTERS } from "@/lib/market";
import type { MarketFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 섹션 안에서 전체/코스피/코스닥 빠른 전환 */
export function MarketFilterLinks({
  current,
  pathname: pathnameOverride,
}: {
  current: MarketFilter;
  pathname?: string;
}) {
  const pathname = pathnameOverride ?? usePathname();

  return (
    <div className="flex flex-wrap gap-1">
      {MARKET_FILTERS.map((tab) => (
        <Link
          key={tab.key}
          href={hrefWithMarket(pathname, tab.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            current === tab.key
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
