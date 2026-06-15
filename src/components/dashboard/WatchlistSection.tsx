import { Star } from "lucide-react";
import { StockCard } from "@/components/dashboard/StockCard";
import { Card, CardTitle } from "@/components/ui/Card";
import type { StockSummary } from "@/lib/types";

/** 대시보드 상단 — 즐겨찾기 종목 우선 표시 */
export function WatchlistSection({ stocks }: { stocks: StockSummary[] }) {
  return (
    <section className="mb-8">
      <Card className="border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 dark:border-amber-900/50 dark:from-slate-900 dark:to-amber-950/20">
        <CardTitle subtitle="관심 종목을 검색·상세 페이지에서 ★ 추가">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            즐겨찾기 종목
          </span>
        </CardTitle>

        {stocks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            아직 즐겨찾기한 종목이 없습니다. 종목 검색 또는 상세 페이지에서 ★를 눌러 추가하세요.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stocks.map((stock) => (
              <StockCard key={stock.code} stock={stock} showFavorite isFavorite />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
