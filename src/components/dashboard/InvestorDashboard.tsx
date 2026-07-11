import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { InvestorTop10SnapshotSection } from "@/components/dashboard/InvestorTop10SnapshotSection";
import {
  DeferredInvestorRankingsFallback,
  DeferredInvestorRankingsSection,
} from "@/components/dashboard/DeferredInvestorRankingsSection";
import {
  DeferredInvestorStreakFallback,
  DeferredInvestorStreakSection,
} from "@/components/dashboard/DeferredInvestorStreakSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import {
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

  const [meta, top10] = await Promise.all([
    getMinimalInvestorDashboardMeta(investorType),
    getInvestorTop10Snapshot(investorType, "60d", rankMarket),
  ]);

  const rankMarketLabel = marketFilterLabel(rankMarket);

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
          <section className="mb-8">
            <WatchlistSection />
          </section>

          <section className="mb-8">
            <StockSearch market={market} />
          </section>

          <section className="mb-8">
            <InvestorTop10SnapshotSection
              snapshot={top10}
              marketLabel={rankMarketLabel}
              title={title}
            />
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
    </AppShell>
  );
}
