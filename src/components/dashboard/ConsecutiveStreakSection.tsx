import { ConsecutiveStreakPanel } from "@/components/dashboard/ConsecutiveStreakPanel";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type { ConsecutiveInflowEntry, MarketFilter } from "@/lib/types";
import { Suspense } from "react";

export function ConsecutiveStreakSection({
  inflow,
  outflow,
  tradeDate,
  market,
  marketLabel,
}: {
  inflow: ConsecutiveInflowEntry[];
  outflow: ConsecutiveInflowEntry[];
  tradeDate: string | null;
  market: MarketFilter;
  marketLabel: string;
}) {
  return (
    <section>
      <div className="mb-3">
        <Suspense fallback={null}>
          <MarketFilterLinks current={market} paramName="streakMarket" pathname="/" />
        </Suspense>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ConsecutiveStreakPanel
          entries={inflow}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
          variant="inflow"
        />
        <ConsecutiveStreakPanel
          entries={outflow}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
          variant="outflow"
        />
      </div>
    </section>
  );
}
