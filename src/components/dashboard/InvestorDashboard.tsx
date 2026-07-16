import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { InvestorTop10SnapshotSection } from "@/components/dashboard/InvestorTop10SnapshotSection";
import { InvestorFlowSummary } from "@/components/dashboard/InvestorFlowSummary";
import { IndividualDashboardTabs } from "@/components/dashboard/IndividualDashboardTabs";
import { InvestorDataFootnote } from "@/components/dashboard/InvestorDataFootnote";
import {
  DeferredInvestorRankingsFallback,
  DeferredInvestorRankingsSection,
} from "@/components/dashboard/DeferredInvestorRankingsSection";
import {
  DeferredInvestorStreakFallback,
  DeferredInvestorStreakSection,
} from "@/components/dashboard/DeferredInvestorStreakSection";
import { RankingTableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import {
  getFullPeriodInvestorRankings,
  getAllPeriodInvestorRankings,
  getInvestorConsecutiveStreakTops,
  getInvestorDayFlowSummary,
  getInvestorTop10Snapshot,
  getMinimalInvestorDashboardMeta,
} from "@/lib/services/investor-ranking-service";
import type { InvestorType } from "@/lib/types";

export const revalidate = 600;

interface InvestorDashboardProps {
  investorType: InvestorType;
  title: string;
  pathname: string;
  searchParams: Promise<{
    market?: string;
    rankMarket?: string;
    streakMarket?: string;
  }>;
}

async function IndividualTabsSection({
  investorType,
  rankMarket,
  streakMarket,
  pathname,
}: {
  investorType: InvestorType;
  rankMarket: ReturnType<typeof parseMarketFilter>;
  streakMarket: ReturnType<typeof parseMarketFilter>;
  pathname: string;
}) {
  const [rankings, fullRankings, streaks] = await Promise.all([
    getAllPeriodInvestorRankings(investorType, 10, rankMarket),
    getFullPeriodInvestorRankings(investorType, rankMarket, 500),
    getInvestorConsecutiveStreakTops(investorType, streakMarket, 10),
  ]);

  return (
    <IndividualDashboardTabs
      rankings={rankings}
      fullRankings={fullRankings}
      streaks={streaks}
      rankMarket={rankMarket}
      streakMarket={streakMarket}
      rankMarketLabel={marketFilterLabel(rankMarket)}
      streakMarketLabel={marketFilterLabel(streakMarket)}
      pathname={pathname}
    />
  );
}

export async function InvestorDashboard({
  investorType,
  title,
  pathname,
  searchParams,
}: InvestorDashboardProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);
  const rankMarket = parseMarketFilter(params.rankMarket);
  const streakMarket = parseMarketFilter(params.streakMarket);
  const isIndividual = pathname === "/individual";

  const [meta, top10, flowSummary] = await Promise.all([
    getMinimalInvestorDashboardMeta(investorType),
    isIndividual
      ? Promise.resolve(null)
      : getInvestorTop10Snapshot(investorType, "60d", rankMarket),
    isIndividual
      ? getInvestorDayFlowSummary(investorType, rankMarket)
      : Promise.resolve(null),
  ]);

  const rankMarketLabel = marketFilterLabel(rankMarket);
  const investorLabel = investorType === "INDIVIDUAL" ? "개인" : "기관";

  return (
    <AppShell hasData={meta.hasData}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {rankMarketLabel} · {meta.trackedCount.toLocaleString()}종목 ·{" "}
          {meta.hasData ? meta.lastUpdated : "데이터 없음"}
        </p>
      </section>

      {!meta.hasData ? (
        <EmptyState
          title="실데이터가 아직 없습니다"
          description="py scripts/ingest.py --market ALL --days 14 로 투자자 순매수 수집을 실행하세요."
        />
      ) : (
        <>
          {flowSummary ? (
            <section className="mb-6">
              <InvestorFlowSummary
                summary={flowSummary}
                investorLabel={investorLabel}
              />
            </section>
          ) : null}

          <section className="mb-8">
            <WatchlistSection />
          </section>

          <section className="mb-8">
            <StockSearch market={market} />
          </section>

          {isIndividual ? (
            <>
              <section className="mb-8">
                <Suspense fallback={<RankingTableSkeleton />}>
                  <IndividualTabsSection
                    investorType={investorType}
                    rankMarket={rankMarket}
                    streakMarket={streakMarket}
                    pathname={pathname}
                  />
                </Suspense>
              </section>
              <section className="mb-4">
                <InvestorDataFootnote
                  tradeDate={
                    flowSummary?.tradeDate ??
                    (meta.hasData ? meta.lastUpdated : null)
                  }
                  trackedCount={meta.trackedCount}
                  investorLabel={investorLabel}
                />
              </section>
            </>
          ) : (
            <>
              <section className="mb-8">
                {top10 ? (
                  <InvestorTop10SnapshotSection
                    snapshot={top10}
                    marketLabel={rankMarketLabel}
                    title={title}
                    fullRankingsHref={
                      rankMarket === "ALL"
                        ? `${pathname}/rankings`
                        : `${pathname}/rankings?market=${rankMarket}`
                    }
                  />
                ) : null}
              </section>

              <section className="mb-8">
                <Suspense fallback={<DeferredInvestorRankingsFallback />}>
                  <DeferredInvestorRankingsSection
                    investorType={investorType}
                    rankMarket={rankMarket}
                    title={`${title} 랭킹`}
                    pathname={pathname}
                  />
                </Suspense>
              </section>

              <section className="mb-8">
                <Suspense fallback={<DeferredInvestorStreakFallback />}>
                  <DeferredInvestorStreakSection
                    investorType={investorType}
                    streakMarket={streakMarket}
                    pathname={pathname}
                  />
                </Suspense>
              </section>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
