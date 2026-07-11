"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { OwnershipSparkline } from "@/components/dashboard/OwnershipSparkline";
import type { ConsecutiveInflowEntry, RankingPeriod } from "@/lib/types";
import { cn, changeColor, formatChange, formatRatio } from "@/lib/utils";

type PeriodView = RankingPeriod | "all";

const PERIOD_TABS: { key: PeriodView; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
  { key: "all", label: "전체" },
];

function valueForPeriod(entry: ConsecutiveInflowEntry, period: RankingPeriod): number {
  if (period === "1d") return entry.change1d;
  if (period === "5d") return entry.change5d;
  if (period === "20d") return entry.change20d;
  return entry.change60d;
}

function ChangeCell({ value }: { value: number }) {
  return (
    <td
      className={cn(
        "max-w-0 overflow-hidden py-1.5 pr-0.5 text-right text-[9px] font-semibold tabular-nums last:pr-0 sm:text-[10px]",
        changeColor(value),
      )}
    >
      <span className="block truncate">{formatChange(value)}</span>
    </td>
  );
}

export function ConsecutiveStreakPanel({
  entries,
  tradeDate,
  marketLabel,
  variant,
  periodView,
}: {
  entries: ConsecutiveInflowEntry[];
  tradeDate: string | null;
  marketLabel: string;
  variant: "inflow" | "outflow";
  periodView: PeriodView;
}) {
  const isInflow = variant === "inflow";
  const title = isInflow ? "연속 유입 TOP 10" : "연속 유출 TOP 10";
  const Icon = isInflow ? TrendingUp : TrendingDown;
  const iconClass = isInflow ? "text-emerald-500" : "text-rose-500";
  const badgeClass = isInflow
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
    : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200";
  const emptyMsg = isInflow
    ? "3일 이상 연속 지분 증가 종목이 없습니다."
    : "3일 이상 연속 지분 감소 종목이 없습니다.";
  const showAll = periodView === "all";
  const periodLabel =
    periodView === "all" ? "" : (PERIOD_TABS.find((t) => t.key === periodView)?.label ?? "");

  return (
    <Card className="p-3 sm:p-4">
      <CardTitle
        subtitle={
          tradeDate ? `기준일 ${tradeDate} · ${marketLabel}` : "데이터 없음"
        }
        className="mb-2"
        titleClassName="text-sm"
        subtitleClassName="text-xs"
      >
        <span className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", iconClass)} />
          {title}
        </span>
      </CardTitle>

      {entries.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">{emptyMsg}</p>
      ) : (
        <div className="-mx-0.5 overflow-x-auto px-0.5">
          <table
            className={cn(
              "w-full table-fixed text-[11px]",
              showAll ? "min-w-0" : "min-w-0",
            )}
          >
            <thead>
              <tr className="border-b border-slate-100 text-left text-[9px] text-slate-500 dark:border-slate-800">
                <th className="w-6 pb-1.5 pr-0.5 font-medium">#</th>
                <th className="pb-1.5 pr-0.5 font-medium">종목</th>
                <th className="w-9 pb-1.5 pr-0.5 text-center font-medium">연속</th>
                <th className="hidden w-12 pb-1.5 pr-0.5 font-medium sm:table-cell">추이</th>
                {showAll ? (
                  <>
                    <th className="w-9 pb-1.5 pr-0.5 text-right font-medium">1일</th>
                    <th className="w-9 pb-1.5 pr-0.5 text-right font-medium">5일</th>
                    <th className="w-9 pb-1.5 pr-0.5 text-right font-medium">20</th>
                    <th className="w-9 pb-1.5 pr-0.5 text-right font-medium">60</th>
                  </>
                ) : (
                  <th className="w-12 pb-1.5 pr-0.5 text-right font-medium">{periodLabel}</th>
                )}
                <th className="w-10 pb-1.5 text-right font-medium">지분</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.code}
                  className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                >
                  <td className="py-1.5 pr-0.5 font-bold text-slate-500">{i + 1}</td>
                  <td className="max-w-0 py-1.5 pr-0.5">
                    <Link
                      href={`/stocks/${entry.code}`}
                      className="block truncate font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                    >
                      {entry.name}
                    </Link>
                    <p className="truncate text-[9px] text-slate-400">{entry.code}</p>
                  </td>
                  <td className="py-1.5 pr-0.5 text-center">
                    <span
                      className={cn(
                        "inline-block rounded-full px-1 py-0.5 text-[9px] font-bold leading-none",
                        badgeClass,
                      )}
                    >
                      {entry.streakDays}일
                    </span>
                  </td>
                  <td className="hidden py-1.5 pr-0.5 sm:table-cell">
                    <OwnershipSparkline
                      data={entry.ratioHistory60d}
                      width={44}
                      height={18}
                    />
                  </td>
                  {showAll ? (
                    <>
                      <ChangeCell value={entry.change1d} />
                      <ChangeCell value={entry.change5d} />
                      <ChangeCell value={entry.change20d} />
                      <ChangeCell value={entry.change60d} />
                    </>
                  ) : (
                    <ChangeCell value={valueForPeriod(entry, periodView)} />
                  )}
                  <td className="py-1.5 text-right text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                    {formatRatio(entry.currentRatio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function StreakPeriodTabs({
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

export type { PeriodView };
