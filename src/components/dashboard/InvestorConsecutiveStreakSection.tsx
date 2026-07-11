import { InvestorConsecutiveStreakPanel } from "@/components/dashboard/InvestorConsecutiveStreakPanel";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type { InvestorStreakEntry, MarketFilter } from "@/lib/types";
import { Suspense } from "react";

export function InvestorConsecutiveStreakSection({
  inflow,
  outflow,
  tradeDate,
  market,
  marketLabel,
  pathname,
}: {
  inflow: InvestorStreakEntry[];
  outflow: InvestorStreakEntry[];
  tradeDate: string | null;
  market: MarketFilter;
  marketLabel: string;
  pathname: string;
}) {
  return (
    <section>
      <div className="mb-3">
        <Suspense fallback={null}>
          <MarketFilterLinks
            current={market}
            paramName="streakMarket"
            pathname={pathname}
          />
        </Suspense>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InvestorConsecutiveStreakPanel
          entries={inflow}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
          variant="inflow"
        />
        <InvestorConsecutiveStreakPanel
          entries={outflow}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
          variant="outflow"
        />
      </div>
    </section>
  );
}
