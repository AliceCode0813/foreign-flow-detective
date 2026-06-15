"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import type { RankingEntry, RankingPeriod } from "@/lib/types";
import { cn, formatChange, formatRatio, changeColor } from "@/lib/utils";

const TABS: { key: RankingPeriod; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "10d", label: "10일" },
  { key: "30d", label: "30일" },
  { key: "60d", label: "60일" },
];

interface RankingTabsProps {
  rankings: Record<RankingPeriod, { entries: RankingEntry[]; tradeDate: string | null }>;
  marketLabel?: string;
}

export function RankingTabs({ rankings, marketLabel = "전체" }: RankingTabsProps) {
  const [period, setPeriod] = useState<RankingPeriod>("1d");
  const { entries, tradeDate } = rankings[period];

  return (
    <Card>
      <CardTitle subtitle={tradeDate ? `기준일 ${tradeDate}` : "데이터 없음"}>
        <span className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          외국인 지분율 증가 TOP 10 · {marketLabel}
        </span>
      </CardTitle>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPeriod(tab.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === tab.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          랭킹 데이터가 없습니다.
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-2 pr-2 font-medium">순위</th>
                <th className="pb-2 pr-2 font-medium">종목</th>
                <th className="pb-2 pr-2 text-right font-medium">현재 지분</th>
                <th className="pb-2 text-right font-medium">{TABS.find((t) => t.key === period)?.label} 변화</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={`${period}-${entry.code}`}
                  className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                >
                  <td className="py-2.5 pr-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        entry.rank <= 3
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                      )}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <Link
                      href={`/stocks/${entry.code}`}
                      className="font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-400"
                    >
                      {entry.name}
                    </Link>
                    <p className="text-[11px] text-slate-400">{entry.code}</p>
                  </td>
                  <td className="py-2.5 pr-2 text-right text-slate-700 dark:text-slate-300">
                    {formatRatio(entry.currentRatio)}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right font-semibold",
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
      )}
    </Card>
  );
}
