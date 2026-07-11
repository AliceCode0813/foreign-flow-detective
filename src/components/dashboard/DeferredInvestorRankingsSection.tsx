import { InvestorTopChangeRanking } from "@/components/dashboard/InvestorTopChangeRanking";
import { RankingTableSkeleton } from "@/components/ui/Skeleton";
import { getAllPeriodInvestorRankings } from "@/lib/services/investor-ranking-service";
import { marketFilterLabel } from "@/lib/market";
import type { InvestorType, MarketFilter } from "@/lib/types";

export async function DeferredInvestorRankingsSection({
  investorType,
  rankMarket,
  title,
  pathname,
}: {
  investorType: InvestorType;
  rankMarket: MarketFilter;
  title: string;
  pathname: string;
}) {
  const rankings = await getAllPeriodInvestorRankings(investorType, 10, rankMarket);
  const rankMarketLabel = marketFilterLabel(rankMarket);

  return (
    <InvestorTopChangeRanking
      rankings={rankings}
      market={rankMarket}
      marketLabel={rankMarketLabel}
      title={title}
      pathname={pathname}
    />
  );
}

export function DeferredInvestorRankingsFallback() {
  return <RankingTableSkeleton />;
}
