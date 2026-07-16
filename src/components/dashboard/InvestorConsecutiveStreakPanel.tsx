"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { MetricTip } from "@/components/ui/MetricTip";
import type { InvestorStreakEntry, RankingPeriod } from "@/lib/types";
import { cn, changeColor, formatChange, formatNetValue } from "@/lib/utils";
import type { PeriodView } from "@/components/dashboard/ConsecutiveStreakPanel";

const PERIOD_LABELS: Record<Exclude<PeriodView, "all">, string> = {
  "1d": "1일",
  "5d": "5일",
  "20d": "20일",
  "60d": "60일",
};

function valueForPeriod(entry: InvestorStreakEntry, period: RankingPeriod): number {
  if (period === "1d") return entry.change1d;
  if (period === "5d") return entry.change5d;
  if (period === "20d") return entry.change20d;
  return entry.change60d;
}

export function InvestorConsecutiveStreakPanel({
  entries,
  tradeDate,
  marketLabel,
  variant,
  periodView,
}: {
  entries: InvestorStreakEntry[];
  tradeDate: string | null;
  marketLabel: string;
  variant: "inflow" | "outflow";
  periodView: PeriodView;
}) {
  const isInflow = variant === "inflow";
  const title = isInflow ? "연속 순매수 TOP 10" : "연속 순매도 TOP 10";
  const Icon = isInflow ? TrendingUp : TrendingDown;
  const iconClass = isInflow ? "text-emerald-500" : "text-rose-500";
  const badgeClass = isInflow
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
    : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200";
  const emptyMsg = isInflow
    ? "3일 이상 연속 순매수 종목이 없습니다."
    : "3일 이상 연속 순매도 종목이 없습니다.";
  const showAllDesktop = periodView === "all";
  const periodLabel =
    periodView === "all" ? "60일" : PERIOD_LABELS[periodView];
  const effectivePeriod: RankingPeriod =
    periodView === "all" ? "60d" : periodView;

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
        <div className="rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full table-fixed text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[9px] text-slate-500 dark:border-slate-800">
                <th className="w-6 px-1 py-1.5 font-medium">#</th>
                <th className="px-1 py-1.5 font-medium">종목</th>
                <th className="w-9 px-1 py-1.5 text-center font-medium">연속</th>
                {showAllDesktop ? (
                  <>
                    <th className="hidden w-10 px-0.5 py-1.5 text-right font-medium sm:table-cell">
                      1일
                    </th>
                    <th className="hidden w-10 px-0.5 py-1.5 text-right font-medium sm:table-cell">
                      5일
                    </th>
                    <th className="hidden w-10 px-0.5 py-1.5 text-right font-medium sm:table-cell">
                      20
                    </th>
                    <th className="hidden w-10 px-0.5 py-1.5 text-right font-medium sm:table-cell">
                      60
                    </th>
                    <th className="w-[28%] px-1 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200 sm:hidden">
                      누적
                    </th>
                  </>
                ) : (
                  <th className="w-[30%] px-1 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                    <MetricTip
                      label={`${periodLabel} 누적`}
                      tip={`개인 일별 순매수의 최근 ${periodLabel} 합계입니다.`}
                    />
                  </th>
                )}
                <th className="w-12 px-1 py-1.5 text-right font-medium">
                  <MetricTip
                    label="지분"
                    tip="60일 외국인 지분율 변화(%p). 개인 지분이 아닙니다."
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const single = valueForPeriod(entry, effectivePeriod);
                return (
                  <tr
                    key={entry.code}
                    className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                  >
                    <td className="px-1 py-1.5 font-bold text-slate-500">{i + 1}</td>
                    <td className="max-w-0 px-1 py-1.5">
                      <Link
                        href={`/stocks/${entry.code}`}
                        className="line-clamp-2 font-medium leading-snug text-slate-900 hover:text-blue-700 dark:text-slate-100"
                      >
                        {entry.name}
                      </Link>
                      <p className="text-[9px] text-slate-400">
                        당일 {formatNetValue(entry.currentValue)}
                      </p>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-1 py-0.5 text-[9px] font-bold leading-none",
                          badgeClass,
                        )}
                      >
                        {entry.streakDays}일
                      </span>
                    </td>
                    {showAllDesktop ? (
                      <>
                        {[
                          entry.change1d,
                          entry.change5d,
                          entry.change20d,
                          entry.change60d,
                        ].map((v, idx) => (
                          <td
                            key={idx}
                            className={cn(
                              "hidden px-0.5 py-1.5 text-right text-[10px] font-bold tabular-nums sm:table-cell",
                              changeColor(v),
                            )}
                          >
                            {formatNetValue(v)}
                          </td>
                        ))}
                        <td
                          className={cn(
                            "px-1 py-1.5 text-right text-[11px] font-bold tabular-nums sm:hidden",
                            changeColor(entry.change60d),
                          )}
                        >
                          {formatNetValue(entry.change60d)}
                        </td>
                      </>
                    ) : (
                      <td
                        className={cn(
                          "px-1 py-1.5 text-right text-[12px] font-bold tabular-nums",
                          changeColor(single),
                        )}
                      >
                        {formatNetValue(single)}
                      </td>
                    )}
                    <td
                      className={cn(
                        "px-1 py-1.5 text-right text-[10px] font-medium tabular-nums",
                        entry.ownershipChange60d != null
                          ? changeColor(entry.ownershipChange60d)
                          : "text-slate-400",
                      )}
                    >
                      {entry.ownershipChange60d != null
                        ? formatChange(entry.ownershipChange60d)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
