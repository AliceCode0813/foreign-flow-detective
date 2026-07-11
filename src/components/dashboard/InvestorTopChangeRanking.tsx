"use client";

import { Suspense, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type { InvestorRankingEntry, MarketFilter, RankingPeriod } from "@/lib/types";
import type { InvestorPeriodTopBottom } from "@/lib/services/investor-ranking-service";
import { cn, changeColor, formatChange, formatNetValue } from "@/lib/utils";

type PeriodView = RankingPeriod | "all";

const TABS: { key: PeriodView; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
  { key: "all", label: "전체" },
];

interface InvestorTopChangeRankingProps {
  rankings: Record<RankingPeriod, InvestorPeriodTopBottom>;
  market: MarketFilter;
  marketLabel?: string;
  title: string;
  pathname: string;
}

function netForPeriod(entry: InvestorRankingEntry, period: RankingPeriod): number {
  if (period === "1d") return entry.change1d;
  if (period === "5d") return entry.change5d;
  if (period === "20d") return entry.change20d;
  return entry.change60d;
}

function InvestorRankingTable({
  entries,
  periodView,
  variant,
}: {
  entries: InvestorRankingEntry[];
  periodView: PeriodView;
  variant: "top" | "bottom";
}) {
  const isTop = variant === "top";
  const showAll = periodView === "all";
  const periodLabel =
    periodView === "all" ? "" : (TABS.find((t) => t.key === periodView)?.label ?? "");

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">랭킹 데이터가 없습니다.</p>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-100 px-1 dark:border-slate-800">
      <table
        className={cn(
          "w-full text-xs sm:text-sm",
          showAll ? "min-w-[340px]" : "min-w-[280px]",
        )}
      >
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10px] text-slate-500 dark:border-slate-800 sm:text-xs">
            <th className="px-2 py-2 font-medium sm:px-3">#</th>
            <th className="px-2 py-2 font-medium sm:px-3">종목</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">
              {showAll ? "변화" : `${periodLabel} 변화`}
            </th>
            {showAll ? (
              <>
                <th className="px-1.5 py-2 text-right font-medium">1일</th>
                <th className="px-1.5 py-2 text-right font-medium">5일</th>
                <th className="px-1.5 py-2 text-right font-medium">20일</th>
                <th className="px-1.5 py-2 text-right font-medium sm:px-3">60일</th>
              </>
            ) : (
              <th className="px-2 py-2 text-right font-medium sm:px-3">누적 순매수</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const singleNet =
              periodView === "all" ? entry.change : netForPeriod(entry, periodView);
            return (
              <tr
                key={`${variant}-${entry.code}`}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
              >
                <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold sm:h-6 sm:w-6 sm:text-xs",
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
                <td className="max-w-0 px-2 py-2 sm:px-3 sm:py-2.5">
                  <Link
                    href={`/stocks/${entry.code}`}
                    className="block truncate font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                  >
                    {entry.name}
                  </Link>
                  <p className="truncate text-[10px] text-slate-400 sm:text-[11px]">
                    당일 {formatNetValue(entry.currentValue)}
                  </p>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-2 py-2 text-right text-[11px] font-semibold tabular-nums sm:px-3 sm:py-2.5 sm:text-sm",
                    entry.ownershipChange != null
                      ? changeColor(entry.ownershipChange)
                      : "text-slate-400",
                  )}
                >
                  {entry.ownershipChange != null
                    ? formatChange(entry.ownershipChange)
                    : "—"}
                </td>
                {showAll ? (
                  <>
                    <td
                      className={cn(
                        "whitespace-nowrap px-1.5 py-2 text-right text-[10px] font-semibold tabular-nums sm:text-xs",
                        changeColor(entry.change1d),
                      )}
                    >
                      {formatNetValue(entry.change1d)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-1.5 py-2 text-right text-[10px] font-semibold tabular-nums sm:text-xs",
                        changeColor(entry.change5d),
                      )}
                    >
                      {formatNetValue(entry.change5d)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-1.5 py-2 text-right text-[10px] font-semibold tabular-nums sm:text-xs",
                        changeColor(entry.change20d),
                      )}
                    >
                      {formatNetValue(entry.change20d)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-1.5 py-2 text-right text-[10px] font-semibold tabular-nums sm:px-3 sm:text-xs",
                        changeColor(entry.change60d),
                      )}
                    >
                      {formatNetValue(entry.change60d)}
                    </td>
                  </>
                ) : (
                  <td
                    className={cn(
                      "whitespace-nowrap px-2 py-2 text-right text-[11px] font-semibold tabular-nums sm:px-3 sm:py-2.5 sm:text-sm",
                      changeColor(singleNet),
                    )}
                  >
                    {formatNetValue(singleNet)}
                  </td>
                )}
              </tr>
            );
          })}
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
  const [periodView, setPeriodView] = useState<PeriodView>("5d");
  const dataPeriod: RankingPeriod = periodView === "all" ? "60d" : periodView;
  const { top, bottom, tradeDate } = rankings[dataPeriod];

  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · ${marketLabel} · 상위/하위 각 10`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          {title}
        </span>
      </CardTitle>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <Suspense fallback={null}>
          <MarketFilterLinks
            current={market}
            paramName="rankMarket"
            pathname={pathname}
          />
        </Suspense>
        <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriodView(tab.key)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:py-1.5 sm:text-sm",
                periodView === tab.key
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
          <InvestorRankingTable entries={top} periodView={periodView} variant="top" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            순매도 상위
          </h3>
          <InvestorRankingTable
            entries={bottom}
            periodView={periodView}
            variant="bottom"
          />
        </div>
      </div>
    </Card>
  );
}
