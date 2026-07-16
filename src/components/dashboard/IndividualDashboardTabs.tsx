"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import { FullRankingsLink } from "@/components/dashboard/FullRankingsLink";
import {
  InvestorConsecutiveStreakPanel,
} from "@/components/dashboard/InvestorConsecutiveStreakPanel";
import {
  StreakPeriodTabs,
  type PeriodView as StreakPeriodView,
} from "@/components/dashboard/ConsecutiveStreakPanel";
import {
  InvestorRankingTableView,
  PeriodChipTabs,
  type PeriodView,
} from "@/components/dashboard/InvestorRankingTableView";
import type {
  InvestorStreakEntry,
  MarketFilter,
  RankingPeriod,
} from "@/lib/types";
import type { InvestorPeriodTopBottom } from "@/lib/services/investor-ranking-service";
import { cn } from "@/lib/utils";

type MainTab = "period" | "streak" | "full";
type SideTab = "buy" | "sell";

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "period", label: "기간별 순위" },
  { key: "streak", label: "연속 매매" },
  { key: "full", label: "전체 종목" },
];

function SideTabs({
  value,
  onChange,
}: {
  value: SideTab;
  onChange: (v: SideTab) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {(
        [
          { key: "buy" as const, label: "순매수", icon: TrendingUp, active: "text-emerald-700 dark:text-emerald-300" },
          { key: "sell" as const, label: "순매도", icon: TrendingDown, active: "text-rose-700 dark:text-rose-300" },
        ] as const
      ).map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none sm:text-sm",
              value === tab.key
                ? `bg-white shadow-sm dark:bg-slate-700 ${tab.active}`
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function IndividualDashboardTabs({
  rankings,
  fullRankings,
  streaks,
  rankMarket,
  streakMarket,
  rankMarketLabel,
  streakMarketLabel,
  pathname,
}: {
  rankings: Record<RankingPeriod, InvestorPeriodTopBottom>;
  fullRankings: Record<RankingPeriod, InvestorPeriodTopBottom>;
  streaks: {
    inflow: InvestorStreakEntry[];
    outflow: InvestorStreakEntry[];
    tradeDate: string | null;
  };
  rankMarket: MarketFilter;
  streakMarket: MarketFilter;
  rankMarketLabel: string;
  streakMarketLabel: string;
  pathname: string;
}) {
  const [mainTab, setMainTab] = useState<MainTab>("period");
  const [sideTab, setSideTab] = useState<SideTab>("buy");
  const [periodView, setPeriodView] = useState<PeriodView>("5d");
  const [fullPeriodView, setFullPeriodView] = useState<PeriodView>("60d");
  const [streakPeriod, setStreakPeriod] = useState<StreakPeriodView>("60d");

  const dataPeriod: RankingPeriod = periodView === "all" ? "60d" : periodView;
  const fullDataPeriod: RankingPeriod =
    fullPeriodView === "all" ? "60d" : fullPeriodView;

  const periodSlice = rankings[dataPeriod];
  const fullSlice = fullRankings[fullDataPeriod];
  const periodEntries =
    sideTab === "buy" ? periodSlice.top : periodSlice.bottom;
  const fullEntries = sideTab === "buy" ? fullSlice.top : fullSlice.bottom;
  const streakEntries = sideTab === "buy" ? streaks.inflow : streaks.outflow;

  const fullHref =
    rankMarket === "ALL"
      ? `${pathname}/rankings`
      : `${pathname}/rankings?market=${rankMarket}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMainTab(tab.key)}
            className={cn(
              "shrink-0 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-4 sm:text-sm",
              mainTab === tab.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SideTabs value={sideTab} onChange={setSideTab} />

      {mainTab === "period" ? (
        <Card>
          <CardTitle
            className="mb-3"
            subtitle={
              periodSlice.tradeDate
                ? `기준일 ${periodSlice.tradeDate} · ${rankMarketLabel} · 상위 10`
                : "데이터 없음"
            }
          >
            기간별 {sideTab === "buy" ? "순매수" : "순매도"} 순위
          </CardTitle>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Suspense fallback={null}>
                <MarketFilterLinks
                  current={rankMarket}
                  paramName="rankMarket"
                  pathname={pathname}
                />
              </Suspense>
              <FullRankingsLink href={fullHref} />
            </div>
            <PeriodChipTabs value={periodView} onChange={setPeriodView} />
          </div>
          <InvestorRankingTableView
            entries={periodEntries}
            periodView={periodView}
            variant={sideTab === "buy" ? "top" : "bottom"}
          />
        </Card>
      ) : null}

      {mainTab === "streak" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Suspense fallback={null}>
              <MarketFilterLinks
                current={streakMarket}
                paramName="streakMarket"
                pathname={pathname}
              />
            </Suspense>
            <StreakPeriodTabs value={streakPeriod} onChange={setStreakPeriod} />
          </div>
          <InvestorConsecutiveStreakPanel
            entries={streakEntries}
            tradeDate={streaks.tradeDate}
            marketLabel={streakMarketLabel}
            variant={sideTab === "buy" ? "inflow" : "outflow"}
            periodView={streakPeriod}
          />
        </div>
      ) : null}

      {mainTab === "full" ? (
        <Card>
          <CardTitle
            className="mb-3"
            subtitle={
              fullSlice.tradeDate
                ? `기준일 ${fullSlice.tradeDate} · ${rankMarketLabel} · ${fullEntries.length.toLocaleString()}종목`
                : "데이터 없음"
            }
          >
            전체 {sideTab === "buy" ? "순매수" : "순매도"} 순위
          </CardTitle>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Suspense fallback={null}>
                <MarketFilterLinks
                  current={rankMarket}
                  paramName="rankMarket"
                  pathname={pathname}
                />
              </Suspense>
              <Link
                href={fullHref}
                className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-xs"
              >
                전용 페이지에서 보기
              </Link>
            </div>
            <PeriodChipTabs value={fullPeriodView} onChange={setFullPeriodView} />
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <InvestorRankingTableView
              entries={fullEntries}
              periodView={fullPeriodView}
              variant={sideTab === "buy" ? "top" : "bottom"}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
