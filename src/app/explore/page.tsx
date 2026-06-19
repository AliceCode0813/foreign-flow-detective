import { AppShell } from "@/components/layout/AppShell";
import { MarketFilterTabs } from "@/components/dashboard/MarketFilterTabs";
import { MoverSectionsLoader } from "@/components/dashboard/MoverSectionsLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseMarketFilter } from "@/lib/market";
import { getDashboardStats } from "@/lib/services/stock-service";
import { Suspense } from "react";

export const revalidate = 300;

interface ExplorePageProps {
  searchParams: Promise<{ market?: string }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);
  const stats = await getDashboardStats(market);

  const marketLabel =
    market === "KOSPI" ? "코스피" : market === "KOSDAQ" ? "코스닥" : "전체";

  return (
    <AppShell hasData={stats.hasData}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          지분 변동 탐색
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
        <MoverSectionsLoader market={market} marketLabel={marketLabel} />
      )}
    </AppShell>
  );
}
