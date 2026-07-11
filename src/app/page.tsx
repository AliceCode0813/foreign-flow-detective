import { AppShell } from "@/components/layout/AppShell";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { MarketFilterTabs } from "@/components/dashboard/MarketFilterTabs";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { Top10SnapshotSection } from "@/components/dashboard/Top10SnapshotSection";
import {
  DeferredHomeMeta,
  DeferredHomeMetaFallback,
} from "@/components/dashboard/DeferredHomeMeta";
import {
  DeferredRankingsFallback,
  DeferredRankingsSection,
} from "@/components/dashboard/DeferredRankingsSection";
import {
  DeferredStreakFallback,
  DeferredStreakSection,
} from "@/components/dashboard/DeferredStreakSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import { getTop10Snapshot } from "@/lib/services/ranking-service";
import { Suspense } from "react";

export const revalidate = 600;

interface DashboardPageProps {
  searchParams: Promise<{
    market?: string;
    rankMarket?: string;
    streakMarket?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);
  const rankMarket = parseMarketFilter(params.rankMarket);
  const streakMarket = parseMarketFilter(params.streakMarket);

  // 첫 페인트: TOP10만 — 메타·랭킹은 Suspense
  const top10 = await getTop10Snapshot("60d", rankMarket);
  const hasData = top10.tradeDate != null;
  const rankMarketLabel = marketFilterLabel(rankMarket);

  return (
    <AppShell hasData={hasData}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          외국인 지분율 대시보드
        </h1>
        <Suspense fallback={<DeferredHomeMetaFallback market={market} />}>
          <DeferredHomeMeta market={market} />
        </Suspense>
      </section>

      <section className="mb-6">
        <Suspense fallback={null}>
          <MarketFilterTabs current={market} />
        </Suspense>
      </section>

      {!hasData ? (
        <EmptyState
          title="실데이터가 아직 없습니다"
          description="npm.cmd run ingest:all 로 전 종목 수집을 실행하세요."
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
            <Top10SnapshotSection snapshot={top10} marketLabel={rankMarketLabel} />
          </section>

          <section className="mb-8">
            <Suspense fallback={<DeferredRankingsFallback />}>
              <DeferredRankingsSection rankMarket={rankMarket} />
            </Suspense>
          </section>

          <section className="mb-8">
            <Suspense fallback={<DeferredStreakFallback />}>
              <DeferredStreakSection streakMarket={streakMarket} />
            </Suspense>
          </section>
        </>
      )}
    </AppShell>
  );
}
