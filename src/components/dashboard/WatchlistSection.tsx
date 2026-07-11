"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { StockCard } from "@/components/dashboard/StockCard";
import { Card, CardTitle } from "@/components/ui/Card";
import { WatchlistSkeleton } from "@/components/ui/Skeleton";
import type { StockSummary } from "@/lib/types";
import { getWatchlistCodes, WATCHLIST_CHANGE_EVENT } from "@/lib/watchlist-client";

/** 대시보드 상단 — 브라우저 localStorage 즐겨찾기 */
export function WatchlistSection() {
  const [stocks, setStocks] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const codes = getWatchlistCodes();
    if (codes.length === 0) {
      setStocks([]);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(WATCHLIST_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(WATCHLIST_CHANGE_EVENT, onChange);
  }, [load]);

  return (
    <section className="mb-8">
      <Card className="border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 dark:border-amber-900/50 dark:from-slate-900 dark:to-amber-950/20">
        <CardTitle subtitle="이 브라우저에만 저장됩니다 · 검색·상세 페이지에서 ★ 추가">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            즐겨찾기 종목
          </span>
        </CardTitle>

        {loading ? (
          <WatchlistSkeleton />
        ) : stocks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            아직 즐겨찾기한 종목이 없습니다. 종목 검색 또는 상세 페이지에서 ★를 눌러 추가하세요.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stocks.map((stock) => (
              <StockCard key={stock.code} stock={stock} showFavorite />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
