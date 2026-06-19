import { AppShell } from "@/components/layout/AppShell";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { TopChangeRanking } from "@/components/dashboard/TopChangeRanking";
import { MarketFilterTabs } from "@/components/dashboard/MarketFilterTabs";
import { ConsecutiveStreakSection } from "@/components/dashboard/ConsecutiveStreakSection";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import { getConsecutiveStreakTops } from "@/lib/services/mover-service";
import { getAllPeriodRankings } from "@/lib/services/ranking-service";
import { getDashboardStats } from "@/lib/services/stock-service";
import { getWatchlistStocks } from "@/lib/services/watchlist-service";
import { Suspense } from "react";

export const revalidate = 300;

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

  const [stats, rankings, watchlist, streaks] = await Promise.all([
    getDashboardStats(market),
    getAllPeriodRankings(15, rankMarket),
    getWatchlistStocks(),
    getConsecutiveStreakTops(streakMarket, 10),
  ]);

  const marketLabel = marketFilterLabel(market);
  const rankMarketLabel = marketFilterLabel(rankMarket);
  const streakMarketLabel = marketFilterLabel(streakMarket);

  return (
    <AppShell hasData={stats.hasData}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          외국인 지분율 대시보드
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {marketLabel} · {stats.trackedCount.toLocaleString()}종목 ·{" "}
          {stats.hasData ? stats.lastUpdated : "데이터 없음"}
        </p>
      </section>

      <section className="mb-6">
        <Suspense fallback={null}>
          <MarketFilterTabs current={market} />
        </Suspense>
      </section>

      {!stats.hasData ? (
        <EmptyState
          title="실데이터가 아직 없습니다"
          description="npm.cmd run ingest:all 로 전 종목 수집을 실행하세요."
        />
      ) : (
        <>
          <section className="mb-8">
            <StockSearch market={market} />
          </section>

          <section className="mb-8">
            <TopChangeRanking
              rankings={rankings}
              market={rankMarket}
              marketLabel={rankMarketLabel}
            />
          </section>

          <WatchlistSection stocks={watchlist} />

          <section className="mb-8 mt-8">
            <ConsecutiveStreakSection
              inflow={streaks.inflow}
              outflow={streaks.outflow}
              tradeDate={streaks.tradeDate}
              market={streakMarket}
              marketLabel={streakMarketLabel}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}
