import { AppShell } from "@/components/layout/AppShell";
import { ForeignFullRankingsView } from "@/components/dashboard/FullRankingsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import { getFullPeriodRankings } from "@/lib/services/ranking-service";

export const revalidate = 600;

interface RankingsPageProps {
  searchParams: Promise<{ market?: string }>;
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);
  const rankings = await getFullPeriodRankings(market, 500);
  const marketLabel = marketFilterLabel(market);
  const hasData = rankings["60d"].tradeDate != null;

  const backQs = market !== "ALL" ? `?rankMarket=${market}` : "";

  return (
    <AppShell hasData={hasData}>
      {!hasData ? (
        <EmptyState
          title="실데이터가 아직 없습니다"
          description="npm.cmd run ingest:all 로 전 종목 수집을 실행하세요."
        />
      ) : (
        <ForeignFullRankingsView
          rankings={rankings}
          market={market}
          marketLabel={marketLabel}
          backHref={`/${backQs}`}
        />
      )}
    </AppShell>
  );
}
