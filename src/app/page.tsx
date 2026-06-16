import { AppShell } from "@/components/layout/AppShell";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { TopChangeRanking } from "@/components/dashboard/TopChangeRanking";
import { MarketFilterTabs } from "@/components/dashboard/MarketFilterTabs";
import { ConsecutiveInflowPanel } from "@/components/dashboard/ConsecutiveInflowPanel";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseMarketFilter } from "@/lib/market";
import { getConsecutiveInflowTop } from "@/lib/services/mover-service";
import { getAllPeriodRankings } from "@/lib/services/ranking-service";
import { getDashboardStats, getLatestTradeDate } from "@/lib/services/stock-service";
import { getWatchlistStocks } from "@/lib/services/watchlist-service";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ market?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);

  const [stats, rankings, watchlist, consecutiveInflow, tradeDate] = await Promise.all([
    getDashboardStats(market),
    getAllPeriodRankings(30, market),
    getWatchlistStocks(),
    getConsecutiveInflowTop(market, 10),
    getLatestTradeDate(),
  ]);

  const marketLabel =
    market === "KOSPI" ? "코스피" : market === "KOSDAQ" ? "코스닥" : "전체";

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
            <TopChangeRanking rankings={rankings} marketLabel={marketLabel} />
          </section>

          <WatchlistSection stocks={watchlist} />

          <section className="mb-8 mt-8">
            <ConsecutiveInflowPanel
              entries={consecutiveInflow}
              tradeDate={tradeDate}
              marketLabel={marketLabel}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}
