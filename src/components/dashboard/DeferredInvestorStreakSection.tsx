import { CardSkeleton } from "@/components/ui/Skeleton";
import { getInvestorConsecutiveStreakTops } from "@/lib/services/investor-ranking-service";
import { marketFilterLabel } from "@/lib/market";
import { InvestorConsecutiveStreakSection } from "@/components/dashboard/InvestorConsecutiveStreakSection";
import type { InvestorType, MarketFilter } from "@/lib/types";

export async function DeferredInvestorStreakSection({
  investorType,
  streakMarket,
  pathname,
}: {
  investorType: InvestorType;
  streakMarket: MarketFilter;
  pathname: string;
}) {
  const streaks = await getInvestorConsecutiveStreakTops(investorType, streakMarket, 10);
  const streakMarketLabel = marketFilterLabel(streakMarket);

  return (
    <InvestorConsecutiveStreakSection
      inflow={streaks.inflow}
      outflow={streaks.outflow}
      tradeDate={streaks.tradeDate}
      market={streakMarket}
      marketLabel={streakMarketLabel}
      pathname={pathname}
    />
  );
}

export function DeferredInvestorStreakFallback() {
  return <CardSkeleton rows={6} />;
}
