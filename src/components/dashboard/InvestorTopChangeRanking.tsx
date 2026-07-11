"use client";

import { Suspense, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type { InvestorRankingEntry, MarketFilter, RankingPeriod } from "@/lib/types";
import type { InvestorPeriodTopBottom } from "@/lib/services/investor-ranking-service";
import { cn, changeColor, formatNetValue } from "@/lib/utils";

const TABS: { key: RankingPeriod; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
];

interface InvestorTopChangeRankingProps {
  rankings: Record<RankingPeriod, InvestorPeriodTopBottom>;
  market: MarketFilter;
  marketLabel?: string;
  title: string;
  pathname: string;
}

function InvestorRankingTable({
  entries,
  periodLabel,
  variant,
}: {
  entries: InvestorRankingEntry[];
  periodLabel: string;
  variant: "top" | "bottom";
}) {
  const isTop = variant === "top";

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">랭킹 데이터가 없습니다.</p>
    );
  }

  return (
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
      <table className="w-full min-w-[280px] text-sm">
        <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-slate-800">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">종목</th>
            <th className="px-3 py-2 text-right font-medium">당일 순매수</th>
            <th className="px-3 py-2 text-right font-medium">{periodLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${variant}-${entry.code}`}
              className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
            >
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    entry.rank <= 3
                      ? isTop
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                  )}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/stocks/${entry.code}`}
                  className="font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                >
                  {entry.name}
                </Link>
                <p className="text-[11px] text-slate-400">
                  {entry.code} · {entry.market}
                </p>
              </td>
              <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                {formatNetValue(entry.currentValue)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right font-semibold",
                  changeColor(entry.change),
                )}
              >
                {formatNetValue(entry.change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvestorTopChangeRanking({
  rankings,
  market,
  marketLabel = "전체",
  title,
  pathname,
}: InvestorTopChangeRankingProps) {
  const [period, setPeriod] = useState<RankingPeriod>("5d");
  const { top, bottom, tradeDate } = rankings[period];
  const periodLabel = TABS.find((t) => t.key === period)?.label ?? "";

  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · ${marketLabel} · 상위/하위 각 15`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          {title}
        </span>
      </CardTitle>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={null}>
          <MarketFilterLinks
            current={market}
            paramName="rankMarket"
            pathname={pathname}
          />
        </Suspense>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                period === tab.key
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4" />
            순매수 상위
          </h3>
          <InvestorRankingTable
            entries={top}
            periodLabel={`${periodLabel} 누적 순매수`}
            variant="top"
          />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            순매도 상위
          </h3>
          <InvestorRankingTable
            entries={bottom}
            periodLabel={`${periodLabel} 누적 순매수`}
            variant="bottom"
          />
        </div>
      </div>
    </Card>
  );
}
