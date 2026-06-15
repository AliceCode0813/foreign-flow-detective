"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { FavoriteButton } from "@/components/stock/FavoriteButton";
import type { MarketFilter, StockSummary } from "@/lib/types";
import { formatChange, formatRatio, changeColor } from "@/lib/utils";

interface StockSearchProps {
  market: MarketFilter;
  initialWatchlistCodes?: string[];
}

export function StockSearch({
  market,
  initialWatchlistCodes = [],
}: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [watchlistCodes, setWatchlistCodes] = useState(
    () => new Set(initialWatchlistCodes),
  );

  const fetchResults = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, market });
        const res = await fetch(`/api/stocks/search?${params}`);
        const data = (await res.json()) as { stocks: StockSummary[] };
        setResults(data.stocks ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [market],
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    setWatchlistCodes(new Set(initialWatchlistCodes));
  }, [initialWatchlistCodes]);

  return (
    <Card>
      <CardTitle subtitle="종목명·코드 검색 후 ★로 즐겨찾기 추가">종목 검색</CardTitle>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 삼성전자, 005930"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <ul className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {loading ? (
          <li className="py-6 text-center text-sm text-slate-500">검색 중...</li>
        ) : results.length === 0 ? (
          <li className="py-6 text-center text-sm text-slate-500">
            {query ? "검색 결과 없음" : "검색어를 입력하세요"}
          </li>
        ) : (
          results.map((stock) => (
            <li key={stock.code} className="flex items-center gap-1">
              <FavoriteButton
                code={stock.code}
                initialActive={watchlistCodes.has(stock.code)}
                size="sm"
              />
              <Link
                href={`/stocks/${stock.code}`}
                className="flex flex-1 items-center justify-between gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {stock.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {stock.code} · {stock.market}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatRatio(stock.currentRatio)}</p>
                  <p className={`text-xs font-medium ${changeColor(stock.change30d)}`}>
                    30일 {formatChange(stock.change30d)}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
