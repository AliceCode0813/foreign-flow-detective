import { AppShell } from "@/components/layout/AppShell";
import { InvestorFullRankingsView } from "@/components/dashboard/FullRankingsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import {
  getFullPeriodInvestorRankings,
  getMinimalInvestorDashboardMeta,
} from "@/lib/services/investor-ranking-service";

export const revalidate = 600;

interface PageProps {
  searchParams: Promise<{ market?: string }>;
}

export default async function InstitutionalRankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const market = parseMarketFilter(params.market);
  const [meta, rankings] = await Promise.all([
    getMinimalInvestorDashboardMeta("INSTITUTION"),
    getFullPeriodInvestorRankings("INSTITUTION", market, 500),
  ]);
  const marketLabel = marketFilterLabel(market);
  const backQs = market !== "ALL" ? `?rankMarket=${market}` : "";

  return (
    <AppShell hasData={meta.hasData}>
      {!meta.hasData ? (
        <EmptyState
          title="실데이터가 아직 없습니다"
          description="투자자 순매수 수집을 실행하세요."
        />
      ) : (
        <InvestorFullRankingsView
          rankings={rankings}
          market={market}
          marketLabel={marketLabel}
          title="기관 매매 동향"
          pathname="/institutional/rankings"
          backHref={`/institutional${backQs}`}
        />
      )}
    </AppShell>
  );
}
