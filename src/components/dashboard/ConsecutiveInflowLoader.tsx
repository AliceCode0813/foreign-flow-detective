"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ConsecutiveInflowPanel } from "@/components/dashboard/ConsecutiveInflowPanel";
import type { ConsecutiveInflowEntry, MarketFilter } from "@/lib/types";

/** 연속 유입 TOP — 클라이언트에서 /api/movers/consecutive 로 지연 로드 */
export function ConsecutiveInflowLoader({
  market,
  marketLabel,
}: {
  market: MarketFilter;
  marketLabel: string;
}) {
  const [entries, setEntries] = useState<ConsecutiveInflowEntry[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/movers/consecutive?market=${market}&limit=10`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(
        (data: {
          entries?: ConsecutiveInflowEntry[];
          tradeDate?: string | null;
          error?: string;
        }) => {
          if (cancelled) return;
          if (data.error) throw new Error(data.error);
          setEntries(data.entries ?? []);
          setTradeDate(data.tradeDate ?? null);
        },
      )
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [market]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          연속 유입 데이터 불러오는 중…
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        연속 유입 데이터를 불러오지 못했습니다. ({error})
      </div>
    );
  }

  return (
    <ConsecutiveInflowPanel
      entries={entries}
      tradeDate={tradeDate}
      market={market}
      marketLabel={marketLabel}
    />
  );
}
