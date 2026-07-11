"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { RankingEntry, RankingPeriod } from "@/lib/types";
import type { PeriodTopBottom } from "@/lib/services/ranking-service";
import { cn, formatChange, formatNetValue, formatRatio, changeColor } from "@/lib/utils";

type PeriodView = RankingPeriod | "all";

const PERIOD_TABS: { key: PeriodView; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
  { key: "all", label: "전체" },
];

function netForPeriod(entry: RankingEntry, period: RankingPeriod): number | null {
  if (period === "1d") return entry.netPurchase1d;
  if (period === "5d") return entry.netPurchase5d;
  if (period === "20d") return entry.netPurchase20d;
  return entry.netPurchase60d;
}

function NetCell({ value }: { value: number | null }) {
  return (
    <td
      className={cn(
        "whitespace-nowrap py-1.5 pr-1 text-right text-[10px] font-semibold tabular-nums last:pr-0 sm:text-[11px]",
        value != null ? changeColor(value) : "text-slate-400",
      )}
    >
      {value != null ? formatNetValue(value) : "—"}
    </td>
  );
}

function CompactRankingTable({
  entries,
  variant,
  periodView,
}: {
  entries: RankingEntry[];
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
                  지분 {formatRatio(entry.currentRatio)}
                </p>
              </td>
              <td
                className={cn(
                  "whitespace-nowrap py-1.5 pr-1 text-right text-[10px] font-semibold tabular-nums sm:text-[11px]",
                  changeColor(entry.change),
                )}
              >
                {formatChange(entry.change)}
              </td>
              {showAll ? (
                <>
                  <NetCell value={entry.netPurchase1d} />
                  <NetCell value={entry.netPurchase5d} />
                  <NetCell value={entry.netPurchase20d} />
                  <NetCell value={entry.netPurchase60d} />
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

/** 사전 계산 TOP10 — 대시보드 우선 로드 */
export function Top10SnapshotSection({
  snapshot,
  marketLabel,
}: {
  snapshot: PeriodTopBottom;
  marketLabel: string;
}) {
  const [periodView, setPeriodView] = useState<PeriodView>("60d");
  const { top, bottom, tradeDate } = snapshot;

  return (
    <Card>
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle
          className="mb-0"
          subtitle={
            tradeDate
              ? `기준일 ${tradeDate} · ${marketLabel} · 60일 지분 변화 TOP10`
              : "데이터 없음"
          }
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            외국인 지분 TOP10
          </span>
        </CardTitle>
        <PeriodTabs value={periodView} onChange={setPeriodView} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4" />
            증가 TOP10
          </h3>
          <CompactRankingTable entries={top} variant="top" periodView={periodView} />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            감소 TOP10
          </h3>
          <CompactRankingTable entries={bottom} variant="bottom" periodView={periodView} />
        </div>
      </div>
    </Card>
  );
}
