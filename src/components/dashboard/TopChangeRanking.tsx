"use client";

import { useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type { MarketFilter, RankingEntry, RankingPeriod } from "@/lib/types";
import type { PeriodTopBottom } from "@/lib/services/ranking-service";
import { cn, formatChange, formatRatio, changeColor } from "@/lib/utils";

const TABS: { key: RankingPeriod; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "10d", label: "10일" },
  { key: "30d", label: "30일" },
  { key: "60d", label: "60일" },
];

interface TopChangeRankingProps {
  rankings: Record<RankingPeriod, PeriodTopBottom>;
  market: MarketFilter;
  marketLabel?: string;
}

function RankingTable({
  entries,
  periodLabel,
  variant,
}: {
  entries: RankingEntry[];
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
            <th className="px-3 py-2 text-right font-medium">지분</th>
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
                {formatRatio(entry.currentRatio)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right font-semibold",
                  changeColor(entry.change),
                )}
              >
                {formatChange(entry.change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TopChangeRanking({
  rankings,
  market,
  marketLabel = "전체",
}: TopChangeRankingProps) {
  const [period, setPeriod] = useState<RankingPeriod>("10d");
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
          외국인 지분 변동
        </span>
      </CardTitle>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MarketFilterLinks current={market} pathname="/" />
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
            증가 상위
          </h3>
          <RankingTable entries={top} periodLabel={`${periodLabel} 변화`} variant="top" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            감소 상위
          </h3>
          <RankingTable entries={bottom} periodLabel={`${periodLabel} 변화`} variant="bottom" />
        </div>
      </div>
    </Card>
  );
}
