import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FavoriteButton } from "@/components/stock/FavoriteButton";
import type { StockSummary } from "@/lib/types";
import { formatChange, formatRatio, changeColor } from "@/lib/utils";

interface StockCardProps {
  stock: StockSummary;
  isFavorite?: boolean;
  showFavorite?: boolean;
}

export function StockCard({
  stock,
  isFavorite = false,
  showFavorite = false,
}: StockCardProps) {
  return (
    <Card className="relative transition-shadow hover:shadow-md">
      {showFavorite && (
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton code={stock.code} initialActive={isFavorite} size="sm" />
        </div>
      )}
      <Link href={`/stocks/${stock.code}`} className="group block">
        <div className="flex items-start justify-between gap-2 pr-6">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {stock.market}
              {stock.sector ? ` · ${stock.sector}` : ""}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-slate-900 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400">
              {stock.name}
            </h3>
            <p className="text-xs text-slate-400">{stock.code}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-600" />
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">외국인 지분율</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatRatio(stock.currentRatio)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">1일 변화</p>
            <p className={`text-sm font-semibold ${changeColor(stock.change1d)}`}>
              {formatChange(stock.change1d)}
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
