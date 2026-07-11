"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type {
  InvestorRankingEntry,
  MarketFilter,
  RankingEntry,
  RankingPeriod,
} from "@/lib/types";
import type { PeriodTopBottom } from "@/lib/services/ranking-service";
import type { InvestorPeriodTopBottom } from "@/lib/services/investor-ranking-service";
import { cn, changeColor, formatChange, formatNetValue, formatRatio } from "@/lib/utils";

type PeriodView = RankingPeriod | "all";

const TABS: { key: PeriodView; label: string }[] = [
  { key: "1d", label: "1일" },
  { key: "5d", label: "5일" },
  { key: "20d", label: "20일" },
  { key: "60d", label: "60일" },
  { key: "all", label: "전체" },
];

function PeriodTabs({
  value,
  onChange,
}: {
  value: PeriodView;
  onChange: (v: PeriodView) => void;
}) {
  return (
    <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {TABS.map((tab) => (
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

function foreignNet(entry: RankingEntry, period: RankingPeriod): number | null {
  if (period === "1d") return entry.netPurchase1d;
  if (period === "5d") return entry.netPurchase5d;
  if (period === "20d") return entry.netPurchase20d;
  return entry.netPurchase60d;
}

function investorNet(entry: InvestorRankingEntry, period: RankingPeriod): number {
  if (period === "1d") return entry.change1d;
  if (period === "5d") return entry.change5d;
  if (period === "20d") return entry.change20d;
  return entry.change60d;
}

function ForeignFullTable({
  entries,
  periodView,
  variant,
}: {
  entries: RankingEntry[];
  periodView: PeriodView;
  variant: "top" | "bottom";
}) {
  const isTop = variant === "top";
  const showAll = periodView === "all";
  const periodLabel =
    periodView === "all" ? "" : (TABS.find((t) => t.key === periodView)?.label ?? "");

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">데이터가 없습니다.</p>;
  }

  return (
    <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-100 px-1 dark:border-slate-800">
      <table className={cn("w-full text-xs sm:text-sm", showAll ? "min-w-[320px]" : "min-w-[260px]")}>
        <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
          <tr className="border-b border-slate-100 text-left text-[10px] text-slate-500 dark:border-slate-800 sm:text-xs">
            <th className="px-2 py-2 font-medium sm:px-3">#</th>
            <th className="px-2 py-2 font-medium sm:px-3">종목</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">
              {showAll ? "변화" : `${periodLabel} 변화`}
            </th>
            {showAll ? (
              <>
                <th className="px-1 py-2 text-right font-medium">1일</th>
                <th className="px-1 py-2 text-right font-medium">5일</th>
                <th className="px-1 py-2 text-right font-medium">20</th>
                <th className="px-1 py-2 text-right font-medium sm:px-2">60</th>
              </>
            ) : (
              <th className="px-2 py-2 text-right font-medium sm:px-3">누적 순매수</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const single =
              periodView === "all" ? null : foreignNet(entry, periodView);
            return (
              <tr
                key={`${variant}-${entry.code}`}
                className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
              >
                <td className="px-2 py-1.5 tabular-nums text-slate-500 sm:px-3">{entry.rank}</td>
                <td className="max-w-0 px-2 py-1.5 sm:px-3">
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
                    "whitespace-nowrap px-2 py-1.5 text-right text-[11px] font-semibold tabular-nums sm:px-3",
                    changeColor(entry.change),
                  )}
                >
                  {formatChange(entry.change)}
                </td>
                {showAll ? (
                  <>
                    {[entry.netPurchase1d, entry.netPurchase5d, entry.netPurchase20d, entry.netPurchase60d].map(
                      (v, i) => (
                        <td
                          key={i}
                          className={cn(
                            "max-w-0 overflow-hidden px-1 py-1.5 text-right text-[9px] font-semibold tabular-nums sm:text-[10px]",
                            v != null ? changeColor(v) : "text-slate-400",
                          )}
                        >
                          <span className="block truncate">
                            {v != null ? formatNetValue(v) : "—"}
                          </span>
                        </td>
                      ),
                    )}
                  </>
                ) : (
                  <td
                    className={cn(
                      "whitespace-nowrap px-2 py-1.5 text-right text-[11px] font-semibold tabular-nums sm:px-3",
                      single != null ? changeColor(single) : "text-slate-400",
                    )}
                  >
                    {single != null ? formatNetValue(single) : "—"}
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

function InvestorFullTable({
  entries,
  periodView,
  variant,
}: {
  entries: InvestorRankingEntry[];
  periodView: PeriodView;
  variant: "top" | "bottom";
}) {
  const showAll = periodView === "all";
  const periodLabel =
    periodView === "all" ? "" : (TABS.find((t) => t.key === periodView)?.label ?? "");

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">데이터가 없습니다.</p>;
  }

  return (
    <div className="-mx-1 overflow-x-auto rounded-lg border border-slate-100 px-1 dark:border-slate-800">
      <table className={cn("w-full text-xs sm:text-sm", showAll ? "min-w-[320px]" : "min-w-[260px]")}>
        <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
          <tr className="border-b border-slate-100 text-left text-[10px] text-slate-500 dark:border-slate-800 sm:text-xs">
            <th className="px-2 py-2 font-medium sm:px-3">#</th>
            <th className="px-2 py-2 font-medium sm:px-3">종목</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">
              {showAll ? "변화" : `${periodLabel} 변화`}
            </th>
            {showAll ? (
              <>
                <th className="px-1 py-2 text-right font-medium">1일</th>
                <th className="px-1 py-2 text-right font-medium">5일</th>
                <th className="px-1 py-2 text-right font-medium">20</th>
                <th className="px-1 py-2 text-right font-medium sm:px-2">60</th>
              </>
            ) : (
              <th className="px-2 py-2 text-right font-medium sm:px-3">누적 순매수</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const single =
              periodView === "all" ? entry.change : investorNet(entry, periodView);
            return (
              <tr
                key={`${variant}-${entry.code}`}
                className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
              >
                <td className="px-2 py-1.5 tabular-nums text-slate-500 sm:px-3">{entry.rank}</td>
                <td className="max-w-0 px-2 py-1.5 sm:px-3">
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
                    "whitespace-nowrap px-2 py-1.5 text-right text-[11px] font-semibold tabular-nums sm:px-3",
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
                    {[entry.change1d, entry.change5d, entry.change20d, entry.change60d].map(
                      (v, i) => (
                        <td
                          key={i}
                          className={cn(
                            "max-w-0 overflow-hidden px-1 py-1.5 text-right text-[9px] font-semibold tabular-nums sm:text-[10px]",
                            changeColor(v),
                          )}
                        >
                          <span className="block truncate">{formatNetValue(v)}</span>
                        </td>
                      ),
                    )}
                  </>
                ) : (
                  <td
                    className={cn(
                      "whitespace-nowrap px-2 py-1.5 text-right text-[11px] font-semibold tabular-nums sm:px-3",
                      changeColor(single),
                    )}
                  >
                    {formatNetValue(single)}
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

export function ForeignFullRankingsView({
  rankings,
  market,
  marketLabel,
  backHref,
}: {
  rankings: Record<RankingPeriod, PeriodTopBottom>;
  market: MarketFilter;
  marketLabel: string;
  backHref: string;
}) {
  const [periodView, setPeriodView] = useState<PeriodView>("60d");
  const dataPeriod: RankingPeriod = periodView === "all" ? "60d" : periodView;
  const { top, bottom, tradeDate } = rankings[dataPeriod];

  return (
    <FullRankingsShell
      title="외국인 지분 전체 순위"
      tradeDate={tradeDate}
      marketLabel={marketLabel}
      count={top.length}
      backHref={backHref}
      market={market}
      pathname="/rankings"
      periodView={periodView}
      onPeriodChange={setPeriodView}
      topTitle="증가 순위"
      bottomTitle="감소 순위"
      topTable={
        <ForeignFullTable entries={top} periodView={periodView} variant="top" />
      }
      bottomTable={
        <ForeignFullTable entries={bottom} periodView={periodView} variant="bottom" />
      }
    />
  );
}

export function InvestorFullRankingsView({
  rankings,
  market,
  marketLabel,
  title,
  pathname,
  backHref,
}: {
  rankings: Record<RankingPeriod, InvestorPeriodTopBottom>;
  market: MarketFilter;
  marketLabel: string;
  title: string;
  pathname: string;
  backHref: string;
}) {
  const [periodView, setPeriodView] = useState<PeriodView>("60d");
  const dataPeriod: RankingPeriod = periodView === "all" ? "60d" : periodView;
  const { top, bottom, tradeDate } = rankings[dataPeriod];

  return (
    <FullRankingsShell
      title={`${title} 전체 순위`}
      tradeDate={tradeDate}
      marketLabel={marketLabel}
      count={top.length}
      backHref={backHref}
      market={market}
      pathname={pathname}
      periodView={periodView}
      onPeriodChange={setPeriodView}
      topTitle="순매수 순위"
      bottomTitle="순매도 순위"
      topTable={
        <InvestorFullTable entries={top} periodView={periodView} variant="top" />
      }
      bottomTable={
        <InvestorFullTable entries={bottom} periodView={periodView} variant="bottom" />
      }
    />
  );
}

function FullRankingsShell({
  title,
  tradeDate,
  marketLabel,
  count,
  backHref,
  market,
  pathname,
  periodView,
  onPeriodChange,
  topTitle,
  bottomTitle,
  topTable,
  bottomTable,
}: {
  title: string;
  tradeDate: string | null;
  marketLabel: string;
  count: number;
  backHref: string;
  market: MarketFilter;
  pathname: string;
  periodView: PeriodView;
  onPeriodChange: (v: PeriodView) => void;
  topTitle: string;
  bottomTitle: string;
  topTable: ReactNode;
  bottomTable: ReactNode;
}) {
  return (
    <>
      <div className="mb-4">
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {tradeDate
            ? `기준일 ${tradeDate} · ${marketLabel} · 상위/하위 각 ${count.toLocaleString()}종목`
            : "데이터 없음"}
        </p>
      </div>

      <Card>
        <CardTitle className="mb-3" subtitle="기간·시장을 바꿔 전체 순위를 확인하세요">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            전체 순위
          </span>
        </CardTitle>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Suspense fallback={null}>
            <MarketFilterLinks
              current={market}
              paramName="market"
              pathname={pathname}
            />
          </Suspense>
          <PeriodTabs value={periodView} onChange={onPeriodChange} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <TrendingUp className="h-4 w-4" />
              {topTitle}
            </h3>
            {topTable}
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
              <TrendingDown className="h-4 w-4" />
              {bottomTitle}
            </h3>
            {bottomTable}
          </div>
        </div>
      </Card>
    </>
  );
}
