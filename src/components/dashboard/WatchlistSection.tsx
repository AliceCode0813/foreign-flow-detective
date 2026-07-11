"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronDown, Star } from "lucide-react";
import { StockCard } from "@/components/dashboard/StockCard";
import { Card, CardTitle } from "@/components/ui/Card";
import { WatchlistSkeleton } from "@/components/ui/Skeleton";
import type { StockSummary } from "@/lib/types";
import { getWatchlistCodes, WATCHLIST_CHANGE_EVENT } from "@/lib/watchlist-client";
import { cn } from "@/lib/utils";

/** 즐겨찾기 — idle 후 fetch, 기본 접힘 */
export function WatchlistSection() {
  const [stocks, setStocks] = useState<StockSummary[]>([]);
  const [codeCount, setCodeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    const codes = getWatchlistCodes();
    setCodeCount(codes.length);
    if (codes.length === 0) {
      setStocks([]);
      setFetched(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/watchlist?codes=${codes.join(",")}`);
      if (!res.ok) {
        setStocks([]);
        return;
      }
      const data = (await res.json()) as { stocks: StockSummary[] };
      setStocks(data.stocks ?? []);
    } catch {
      setStocks([]);
    } finally {
      setFetched(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCodeCount(getWatchlistCodes().length);
    const run = () => startTransition(() => void load());
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(run, { timeout: 1200 });
      return () => {
        const cic = (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback;
        cic?.(id);
      };
    }
    const t = window.setTimeout(run, 400);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const onChange = () => {
      setFetched(false);
      void load();
      setExpanded(true);
    };
    window.addEventListener(WATCHLIST_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(WATCHLIST_CHANGE_EVENT, onChange);
  }, [load]);

  return (
    <section className="mb-8">
      <Card className="border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 dark:border-amber-900/50 dark:from-slate-900 dark:to-amber-950/20">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <CardTitle
            subtitle="이 브라우저에만 저장 · ★로 추가"
            className="mb-0 flex-1"
          >
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              즐겨찾기 종목
              {codeCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  {codeCount}
                </span>
              )}
            </span>
          </CardTitle>
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        {expanded && (
          <div className="mt-4">
            {loading || !fetched ? (
              <WatchlistSkeleton />
            ) : stocks.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                아직 즐겨찾기한 종목이 없습니다.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stocks.map((stock) => (
                  <StockCard key={stock.code} stock={stock} showFavorite />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
