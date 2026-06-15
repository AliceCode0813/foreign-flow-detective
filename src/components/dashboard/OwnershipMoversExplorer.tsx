"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, LayoutList } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { InferenceBadge } from "@/components/dashboard/InferenceBadge";
import { OwnershipSparkline } from "@/components/dashboard/OwnershipSparkline";
import { sortMovers } from "@/lib/mover-sort";
import type { MoverSortKey, OwnershipMoverRow } from "@/lib/types";
import {
  cn,
  changeColor,
  formatChange,
  formatMarketCap,
  formatPercent,
  formatRatio,
} from "@/lib/utils";

const SORT_TABS: { key: MoverSortKey; label: string }[] = [
  { key: "volatility", label: "60일 급변순" },
  { key: "change60d", label: "60일 증가순" },
  { key: "marketcap", label: "시총순" },
  { key: "price", label: "전일 상승률순" },
];

function ChangeBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  const positive = value >= 0;
  return (
    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          positive ? "bg-emerald-500" : "bg-rose-500",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function OwnershipMoversExplorer({
  movers,
  tradeDate,
  marketLabel,
}: {
  movers: OwnershipMoverRow[];
  tradeDate: string | null;
  marketLabel: string;
}) {
  const [sort, setSort] = useState<MoverSortKey>("volatility");

  const sorted = useMemo(() => sortMovers(movers, sort), [movers, sort]);
  const maxAbs = useMemo(
    () => Math.max(...sorted.map((m) => m.absChange60d), 0.01),
    [sorted],
  );

  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · ${sorted.length}종목 · 60일 기준 · ${marketLabel}`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-blue-500" />
          전체 종목 지분 변동 탐색
        </span>
      </CardTitle>

      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        <BarChart3 className="mr-1 inline h-3.5 w-3.5" />
        60일 지분 변화와 추이 스파크라인으로 비교합니다. 추정 태그는 60일 주가·거래량 상관
        기반입니다.
      </p>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSort(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              sort === tab.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">표시할 종목이 없습니다.</p>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-slate-800">
                <th className="px-3 py-2 font-medium">종목</th>
                <th className="px-3 py-2 text-right font-medium">시총</th>
                <th className="px-3 py-2 text-right font-medium">전일주가</th>
                <th className="px-3 py-2 text-right font-medium">지분</th>
                <th className="px-3 py-2 font-medium">60일 추이</th>
                <th className="px-3 py-2 font-medium">60일 변화</th>
                <th className="px-3 py-2 font-medium">추정</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr
                  key={entry.code}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
                >
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
                    {formatMarketCap(entry.marketCap)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-medium",
                      changeColor(entry.priceChange1d),
                    )}
                  >
                    {formatPercent(entry.priceChange1d)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {formatRatio(entry.currentRatio)}
                  </td>
                  <td className="px-3 py-2.5">
                    <OwnershipSparkline data={entry.ratioHistory60d} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <ChangeBar value={entry.change60d} max={maxAbs} />
                      <span
                        className={cn(
                          "min-w-[4.5rem] text-right font-semibold",
                          changeColor(entry.change60d),
                        )}
                      >
                        {formatChange(entry.change60d)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <InferenceBadge inference={entry.inference} compact />
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
