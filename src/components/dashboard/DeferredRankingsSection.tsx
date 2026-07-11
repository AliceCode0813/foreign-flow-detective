import { TopChangeRanking } from "@/components/dashboard/TopChangeRanking";
import { RankingTableSkeleton } from "@/components/ui/Skeleton";
import { getAllPeriodRankings } from "@/lib/services/ranking-service";
import { marketFilterLabel, parseMarketFilter } from "@/lib/market";
import type { MarketFilter } from "@/lib/types";

export async function DeferredRankingsSection({
  rankMarket,
}: {
  rankMarket: MarketFilter;
}) {
  const rankings = await getAllPeriodRankings(10, rankMarket);
  const rankMarketLabel = marketFilterLabel(rankMarket);

  return (
    <TopChangeRanking
      rankings={rankings}
      market={rankMarket}
      marketLabel={rankMarketLabel}
    />
  );
}

export function DeferredRankingsFallback() {
  return <RankingTableSkeleton />;
}
