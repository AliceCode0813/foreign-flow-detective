"use client";

import Link from "next/link";
import { MetricTip } from "@/components/ui/MetricTip";
import { cn, changeColor, formatChange, formatNetValue } from "@/lib/utils";
import type { InvestorRankingEntry, RankingPeriod } from "@/lib/types";

export type PeriodView = RankingPeriod | "all";

export const PERIOD_TABS: { key: PeriodView; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
  { key: "all", label: "전체" },
];

const OWNERSHIP_TIP =
  "동일 기간 외국인 지분율 변화(%p)입니다. 개인 보유 비중이 아니라 외국인 지분 변화입니다.";

export function netForPeriod(
  entry: InvestorRankingEntry,
  period: RankingPeriod,
): number {
  if (period === "1d") return entry.change1d;
  if (period === "5d") return entry.change5d;
  if (period === "20d") return entry.change20d;
  return entry.change60d;
}

export function PeriodChipTabs({
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
            "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:py-1.5 sm:text-sm",
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

/**
 * 개인 순위 표
 * - 누적 순매수 강조, 당일 보조, 외국인 지분 변화 툴팁
 * - 360px: 가로 스크롤 없이 table-fixed + 필수 열만
 * - 「전체」기간은 sm 미만에서 60일 단일 열로 축약
 */
export function InvestorRankingTableView({
  entries,
  periodView,
  variant,
}: {
  entries: InvestorRankingEntry[];
  periodView: PeriodView;
  variant: "top" | "bottom";
}) {
  const isTop = variant === "top";
  const showAllDesktop = periodView === "all";
  const periodLabel =
    periodView === "all"
      ? "60일"
      : (PERIOD_TABS.find((t) => t.key === periodView)?.label ?? "");
  const effectiveSinglePeriod: RankingPeriod =
    periodView === "all" ? "60d" : periodView;

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">랭킹 데이터가 없습니다.</p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800">
      <table className="w-full table-fixed text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10px] text-slate-500 dark:border-slate-800 sm:text-xs">
            <th className="w-7 px-1.5 py-2 font-medium sm:w-9 sm:px-2">#</th>
            <th className="px-1.5 py-2 font-medium sm:px-2">종목</th>
            {/* 모바일: 항상 단일 누적 열 / sm+: 전체 모드면 4열 */}
            {showAllDesktop ? (
              <>
                <th className="hidden w-[12%] px-1 py-2 text-right font-medium sm:table-cell">
                  1일
                </th>
                <th className="hidden w-[12%] px-1 py-2 text-right font-medium sm:table-cell">
                  5일
                </th>
                <th className="hidden w-[12%] px-1 py-2 text-right font-medium sm:table-cell">
                  20일
                </th>
                <th className="hidden w-[12%] px-1 py-2 text-right font-medium sm:table-cell">
                  60일
                </th>
                <th className="w-[30%] px-1.5 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 sm:hidden">
                  개인 60일 누적
                </th>
              </>
            ) : (
              <th className="w-[32%] px-1.5 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 sm:w-[34%]">
                <MetricTip
                  label={`개인 ${periodLabel} 누적`}
                  tip={`개인 일별 순매수 금액의 최근 ${periodLabel} 합계(원)입니다.`}
                />
              </th>
            )}
            <th className="w-[22%] px-1 py-2 text-right font-medium sm:w-[20%] sm:px-2">
              <MetricTip label="외국인 지분" tip={OWNERSHIP_TIP} />
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const singleNet = netForPeriod(entry, effectiveSinglePeriod);
            return (
              <tr
                key={`${variant}-${entry.code}`}
                className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
              >
                <td className="px-1.5 py-2 tabular-nums text-slate-500 sm:px-2">
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
                <td className="max-w-0 px-1.5 py-2 sm:px-2">
                  <Link
                    href={`/stocks/${entry.code}`}
                    className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-900 hover:text-blue-700 dark:text-slate-100 sm:text-sm"
                  >
                    {entry.name}
                  </Link>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                    당일 {formatNetValue(entry.currentValue)}
                  </p>
                </td>
                {showAllDesktop ? (
                  <>
                    {[entry.change1d, entry.change5d, entry.change20d, entry.change60d].map(
                      (v, i) => (
                        <td
                          key={i}
                          className={cn(
                            "hidden px-1 py-2 text-right text-[10px] font-bold tabular-nums sm:table-cell sm:text-[11px]",
                            changeColor(v),
                          )}
                        >
                          {formatNetValue(v)}
                        </td>
                      ),
                    )}
                    <td
                      className={cn(
                        "px-1.5 py-2 text-right text-[12px] font-bold tabular-nums sm:hidden",
                        changeColor(entry.change60d),
                      )}
                    >
                      {formatNetValue(entry.change60d)}
                    </td>
                  </>
                ) : (
                  <td
                    className={cn(
                      "px-1.5 py-2 text-right text-[13px] font-bold tabular-nums sm:text-base",
                      changeColor(singleNet),
                    )}
                  >
                    {formatNetValue(singleNet)}
                  </td>
                )}
                <td
                  className={cn(
                    "px-1 py-2 text-right text-[10px] font-medium tabular-nums sm:px-2 sm:text-xs",
                    entry.ownershipChange != null
                      ? changeColor(entry.ownershipChange)
                      : "text-slate-400",
                  )}
                >
                  {entry.ownershipChange != null
                    ? formatChange(entry.ownershipChange)
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
