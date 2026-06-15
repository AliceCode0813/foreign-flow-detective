import { AppShell } from "@/components/layout/AppShell";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { StockSearch } from "@/components/dashboard/StockSearch";
import { StockCard } from "@/components/dashboard/StockCard";
import { RankingTabs } from "@/components/dashboard/RankingTabs";
import { MarketFilterTabs } from "@/components/dashboard/MarketFilterTabs";
import { WatchlistSection } from "@/components/dashboard/WatchlistSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { parseMarketFilter } from "@/lib/market";
import { getAllPeriodRankings } from "@/lib/services/ranking-service";
import { listRecentAlerts } from "@/lib/services/alert-service";
import { DailyVolatilityPanel } from "@/components/dashboard/DailyVolatilityPanel";
import { OwnershipMoversExplorer } from "@/components/dashboard/OwnershipMoversExplorer";
import { CorrelationScatter } from "@/components/dashboard/CorrelationScatter";
import { SectorHeatmap } from "@/components/dashboard/SectorHeatmap";
import { ConsecutiveInflowPanel } from "@/components/dashboard/ConsecutiveInflowPanel";
import {
  buildConsecutiveInflowTop,
  buildCorrelationPoints,
  buildSectorHeatmap,
} from "@/lib/mover-sort";
import {
  getDailyVolatilityTop,
  getOwnershipMovers,
} from "@/lib/services/mover-service";
import {
  getDashboardStats,
  getLatestTradeDate,
  getTopMovers,
} from "@/lib/services/stock-service";
import {
  getWatchlistStocks,
  listWatchlistCodes,
} from "@/lib/services/watchlist-service";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ market?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);

  const [stats, rankings, topMovers, dailyMovers, allMovers, latestTradeDate, alerts, watchlist, watchlistCodes] =
    await Promise.all([
      getDashboardStats(market),
      getAllPeriodRankings(10, market),
      getTopMovers(market, 9),
      getDailyVolatilityTop(market, 10),
      getOwnershipMovers(market),
      getLatestTradeDate(),
      listRecentAlerts(5),
      getWatchlistStocks(),
      listWatchlistCodes(),
    ]);

  const favoriteSet = new Set(watchlistCodes);
  const marketLabel =
    market === "KOSPI" ? "코스피" : market === "KOSDAQ" ? "코스닥" : "전체";

  const correlationPoints = buildCorrelationPoints(allMovers);
  const sectorCells = buildSectorHeatmap(allMovers, market);
  const consecutiveInflow = buildConsecutiveInflowTop(allMovers, 10);

  return (
    <AppShell hasData={stats.hasData}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          외국인 지분율 대시보드
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {marketLabel} · 코스피 {stats.kospiCount}종목 · 코스닥 {stats.kosdaqCount}종목
        </p>
      </section>

      <section className="mb-6">
        <Suspense fallback={null}>
          <MarketFilterTabs current={market} />
        </Suspense>
      </section>

      <section className="mb-8">
        <StatsBar {...stats} marketLabel={marketLabel} />
      </section>

      {!stats.hasData ? (
        <EmptyState
          title="실데이터가 아직 없습니다"
          description="npm.cmd run ingest:all 로 전 종목 수집을 실행하세요."
        />
      ) : (
        <>
          <WatchlistSection stocks={watchlist} />

          <section className="mb-8">
            <DailyVolatilityPanel
              movers={dailyMovers}
              tradeDate={latestTradeDate}
              marketLabel={marketLabel}
            />
          </section>

          <section className="mb-8">
            <ConsecutiveInflowPanel
              entries={consecutiveInflow}
              tradeDate={latestTradeDate}
              marketLabel={marketLabel}
            />
          </section>

          <section className="mb-8 grid gap-6 lg:grid-cols-2">
            <CorrelationScatter points={correlationPoints} marketLabel={marketLabel} />
            <SectorHeatmap cells={sectorCells} marketLabel={marketLabel} />
          </section>

          <section className="mb-8">
            <OwnershipMoversExplorer
              movers={allMovers}
              tradeDate={latestTradeDate}
              marketLabel={marketLabel}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-2">
              <StockSearch
                market={market}
                initialWatchlistCodes={watchlistCodes}
              />
            </section>
            <section className="lg:col-span-3">
              <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                10일 증가 상위 ({marketLabel})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topMovers.map((stock) => (
                  <StockCard
                    key={stock.code}
                    stock={stock}
                    showFavorite
                    isFavorite={favoriteSet.has(stock.code)}
                  />
                ))}
              </div>
            </section>
          </div>

          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RankingTabs rankings={rankings} marketLabel={marketLabel} />
            </div>
            <AlertsPanel alerts={alerts} />
          </section>
        </>
      )}
    </AppShell>
  );
}
