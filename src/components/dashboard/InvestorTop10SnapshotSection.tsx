"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { FullRankingsLink } from "@/components/dashboard/FullRankingsLink";
import type { InvestorRankingEntry, RankingPeriod } from "@/lib/types";
import type { InvestorPeriodTopBottom } from "@/lib/services/investor-ranking-service";
import { cn, changeColor, formatChange, formatNetValue } from "@/lib/utils";

type PeriodView = RankingPeriod | "all";

const PERIOD_TABS: { key: PeriodView; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
  { key: "all", label: "전체" },
];

function netForPeriod(entry: InvestorRankingEntry, period: RankingPeriod): number {
  if (period === "1d") return entry.change1d;
  if (period === "5d") return entry.change5d;
  if (period === "20d") return entry.change20d;
  return entry.change60d;
}

function NetCell({ value }: { value: number }) {
  return (
    <td
      className={cn(
        "whitespace-nowrap py-1.5 pr-1 text-right text-[10px] font-semibold tabular-nums last:pr-0 sm:text-[11px]",
        changeColor(value),
      )}
    >
      {formatNetValue(value)}
    </td>
  );
}

function CompactInvestorRankingTable({
  entries,
  variant,
  periodView,
}: {
  entries: InvestorRankingEntry[];
  variant: "top" | "bottom";
  periodView: PeriodView;
}) {
  const isTop = variant === "top";
  const showAll = periodView === "all";

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">스냅샷 데이터 없음</p>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table
        className={cn(
          "w-full table-fixed text-[11px] sm:text-xs",
          showAll ? "min-w-[320px] sm:min-w-[520px]" : "min-w-[240px] sm:min-w-[360px]",
        )}
      >
        <thead>
          <tr className="border-b border-slate-100 text-left text-[9px] text-slate-500 dark:border-slate-800 sm:text-[10px]">
            <th className="w-7 pb-1.5 pr-1 font-medium">#</th>
            <th className="pb-1.5 pr-1 font-medium">종목</th>
            <th className="w-12 pb-1.5 pr-1 text-right font-medium sm:w-[3.25rem]">변화</th>
            {showAll ? (
              <>
                <th className="w-11 pb-1.5 pr-1 text-right font-medium">1일</th>
                <th className="w-11 pb-1.5 pr-1 text-right font-medium">5일</th>
                <th className="w-11 pb-1.5 pr-1 text-right font-medium">20일</th>
                <th className="w-11 pb-1.5 text-right font-medium">60일</th>
              </>
            ) : (
              <th className="w-14 pb-1.5 text-right font-medium sm:w-16">
                {PERIOD_TABS.find((t) => t.key === periodView)?.label} 순매수
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${variant}-${entry.code}`}
              className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
            >
              <td className="py-1.5 pr-1">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    entry.rank <= 3
                      ? isTop
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="max-w-0 py-1.5 pr-1">
                <Link
                  href={`/stocks/${entry.code}`}
                  className="block truncate font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                >
                  {entry.name}
                </Link>
                <p className="truncate text-[10px] text-slate-400">
                  당일 {formatNetValue(entry.currentValue)}
                </p>
              </td>
              <td
                className={cn(
                  "whitespace-nowrap py-1.5 pr-1 text-right text-[10px] font-semibold tabular-nums sm:text-[11px]",
                  entry.ownershipChange != null
                    ? changeColor(entry.ownershipChange)
                    : "text-slate-400",
                )}
              >
                {entry.ownershipChange != null ? formatChange(entry.ownershipChange) : "—"}
              </td>
              {showAll ? (
                <>
                  <NetCell value={entry.change1d} />
                  <NetCell value={entry.change5d} />
                  <NetCell value={entry.change20d} />
                  <NetCell value={entry.change60d} />
                </>
              ) : (
                <NetCell value={netForPeriod(entry, periodView)} />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeriodTabs({
  value,
  onChange,
}: {
  value: PeriodView;
  onChange: (v: PeriodView) => void;
}) {
  return (
    <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {PERIOD_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs",
            value === tab.key
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function InvestorTop10SnapshotSection({
  snapshot,
  marketLabel,
  title,
  fullRankingsHref,
}: {
  snapshot: InvestorPeriodTopBottom;
  marketLabel: string;
  title: string;
  fullRankingsHref?: string;
}) {
  const [periodView, setPeriodView] = useState<PeriodView>("60d");
  const { top, bottom, tradeDate } = snapshot;

  return (
    <Card>
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:block">
          <CardTitle
            className="mb-0"
            subtitle={
              tradeDate
                ? `기준일 ${tradeDate} · ${marketLabel} · 60일 누적 순매수 TOP10`
                : "데이터 없음"
            }
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              {title} TOP10
            </span>
          </CardTitle>
          {fullRankingsHref ? (
            <FullRankingsLink href={fullRankingsHref} className="sm:mt-1" />
          ) : null}
        </div>
        <PeriodTabs value={periodView} onChange={setPeriodView} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4" />
            순매수 TOP10
          </h3>
          <CompactInvestorRankingTable
            entries={top}
            variant="top"
            periodView={periodView}
          />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            순매도 TOP10
          </h3>
          <CompactInvestorRankingTable
            entries={bottom}
            variant="bottom"
            periodView={periodView}
          />
        </div>
      </div>
    </Card>
  );
}
