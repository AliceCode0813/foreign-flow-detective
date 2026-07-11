"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
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

function NetCell({ value }: { value: number }) {
  return (
    <td
      className={cn(
        "max-w-0 overflow-hidden py-1.5 pr-0.5 text-right text-[9px] font-semibold tabular-nums last:pr-0 sm:text-[10px]",
        changeColor(value),
      )}
    >
      <span className="block truncate">{formatNetValue(value)}</span>
    </td>
  );
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
  const showAll = periodView === "all";
  const periodLabel =
    periodView === "all" ? "" : PERIOD_LABELS[periodView];

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
          <table className="w-full min-w-0 table-fixed text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[9px] text-slate-500 dark:border-slate-800">
                <th className="w-6 pb-1.5 pr-0.5 font-medium">#</th>
                <th className="pb-1.5 pr-0.5 font-medium">종목</th>
                <th className="w-9 pb-1.5 pr-0.5 text-center font-medium">연속</th>
                {showAll ? (
                  <>
                    <th className="w-10 pb-1.5 pr-0.5 text-right font-medium">1일</th>
                    <th className="w-10 pb-1.5 pr-0.5 text-right font-medium">5일</th>
                    <th className="w-10 pb-1.5 pr-0.5 text-right font-medium">20</th>
                    <th className="w-10 pb-1.5 pr-0.5 text-right font-medium">60</th>
                  </>
                ) : (
                  <th className="w-14 pb-1.5 pr-0.5 text-right font-medium">{periodLabel}</th>
                )}
                <th className="w-11 pb-1.5 text-right font-medium">변화</th>
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
                  {showAll ? (
                    <>
                      <NetCell value={entry.change1d} />
                      <NetCell value={entry.change5d} />
                      <NetCell value={entry.change20d} />
                      <NetCell value={entry.change60d} />
                    </>
                  ) : (
                    <NetCell value={valueForPeriod(entry, periodView)} />
                  )}
                  <td
                    className={cn(
                      "whitespace-nowrap py-1.5 text-right text-[10px] font-semibold tabular-nums",
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
