import { ConsecutiveStreakSection } from "@/components/dashboard/ConsecutiveStreakSection";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { getConsecutiveStreakTops } from "@/lib/services/mover-service";
import { marketFilterLabel } from "@/lib/market";
import type { MarketFilter } from "@/lib/types";

export async function DeferredStreakSection({
  streakMarket,
}: {
  streakMarket: MarketFilter;
}) {
  const streaks = await getConsecutiveStreakTops(streakMarket, 10);
  const streakMarketLabel = marketFilterLabel(streakMarket);

  return (
    <ConsecutiveStreakSection
      inflow={streaks.inflow}
      outflow={streaks.outflow}
      tradeDate={streaks.tradeDate}
      market={streakMarket}
      marketLabel={streakMarketLabel}
    />
  );
}

export function DeferredStreakFallback() {
  return <CardSkeleton rows={6} />;
}
