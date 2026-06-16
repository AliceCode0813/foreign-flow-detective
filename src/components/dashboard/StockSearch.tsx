"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { MarketFilter } from "@/lib/types";

interface StockSearchProps {
  market: MarketFilter;
}

export function StockSearch({ market }: StockSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (/^\d{6}$/.test(q)) {
      router.push(`/stocks/${q}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, market, limit: "5" });
      const res = await fetch(`/api/stocks/search?${params}`);
      const data = (await res.json()) as { stocks: { code: string; name: string }[] };
      const stocks = data.stocks ?? [];

      if (stocks.length === 0) {
        setError("검색 결과가 없습니다.");
        return;
      }

      const exact = stocks.find(
        (s) => s.code === q || s.name.toLowerCase() === q.toLowerCase(),
      );
      router.push(`/stocks/${(exact ?? stocks[0]).code}`);
    } catch {
      setError("검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle subtitle="종목명·코드 입력 후 Enter">종목 검색</CardTitle>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          placeholder="예: 삼성전자, 005930"
          disabled={loading}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </form>
      {error && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </Card>
  );
}
