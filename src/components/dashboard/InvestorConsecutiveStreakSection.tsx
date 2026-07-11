"use client";

import { Suspense, useState } from "react";
import { InvestorConsecutiveStreakPanel } from "@/components/dashboard/InvestorConsecutiveStreakPanel";
import {
  StreakPeriodTabs,
  type PeriodView,
} from "@/components/dashboard/ConsecutiveStreakPanel";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import type { InvestorStreakEntry, MarketFilter } from "@/lib/types";

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
  const [periodView, setPeriodView] = useState<PeriodView>("60d");

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Suspense fallback={null}>
          <MarketFilterLinks
            current={market}
            paramName="streakMarket"
            pathname={pathname}
          />
        </Suspense>
        <StreakPeriodTabs value={periodView} onChange={setPeriodView} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InvestorConsecutiveStreakPanel
          entries={inflow}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
          variant="inflow"
          periodView={periodView}
        />
        <InvestorConsecutiveStreakPanel
          entries={outflow}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
          variant="outflow"
          periodView={periodView}
        />
      </div>
    </section>
  );
}
