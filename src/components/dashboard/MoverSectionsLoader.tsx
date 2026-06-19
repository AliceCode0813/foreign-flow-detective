"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DailyVolatilityPanel } from "@/components/dashboard/DailyVolatilityPanel";
import { OwnershipMoversExplorer } from "@/components/dashboard/OwnershipMoversExplorer";
import { CorrelationScatter } from "@/components/dashboard/CorrelationScatter";
import { SectorHeatmap } from "@/components/dashboard/SectorHeatmap";
import {
  buildCorrelationPoints,
  buildSectorHeatmap,
} from "@/lib/mover-sort";
import type { MarketFilter, OwnershipMoverRow } from "@/lib/types";

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

/** 무거운 지분 변동 패널 — 클라이언트에서 /api/movers 로 지연 로드 */
export function MoverSectionsLoader({
  market,
  marketLabel,
}: {
  market: MarketFilter;
  marketLabel: string;
}) {
  const [movers, setMovers] = useState<OwnershipMoverRow[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/movers?market=${market}&sparklineTop=80&limit=500`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { movers?: OwnershipMoverRow[]; tradeDate?: string | null; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setMovers(data.movers ?? []);
        setTradeDate(data.tradeDate ?? null);
      })
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

  const dailyMovers = useMemo(
    () =>
      [...movers]
        .filter((m) => m.absChange1d > 0)
        .sort((a, b) => b.absChange1d - a.absChange1d)
        .slice(0, 10),
    [movers],
  );

  const correlationPoints = useMemo(() => buildCorrelationPoints(movers), [movers]);
  const sectorCells = useMemo(() => buildSectorHeatmap(movers, market), [movers, market]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          지분 변동 데이터 불러오는 중…
        </div>
        <SectionSkeleton rows={4} />
        <SectionSkeleton rows={3} />
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={5} />
        </div>
        <SectionSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        지분 변동 데이터를 불러오지 못했습니다. ({error})
      </div>
    );
  }

  return (
    <>
      <section className="mb-8">
        <DailyVolatilityPanel
          movers={dailyMovers}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
        />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <CorrelationScatter points={correlationPoints} marketLabel={marketLabel} />
        <SectorHeatmap cells={sectorCells} marketLabel={marketLabel} />
      </section>

      <section className="mb-8">
        <OwnershipMoversExplorer
          movers={movers}
          tradeDate={tradeDate}
          marketLabel={marketLabel}
        />
      </section>
    </>
  );
}
