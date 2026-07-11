import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FavoriteButton } from "@/components/stock/FavoriteButton";
import type { StockSummary } from "@/lib/types";
import { formatChange, formatRatio, changeColor, cn } from "@/lib/utils";

interface StockCardProps {
  stock: StockSummary;
  showFavorite?: boolean;
  compact?: boolean;
}

export function StockCard({
  stock,
  showFavorite = false,
  compact = false,
}: StockCardProps) {
  return (
    <Card
      className={cn(
        "relative transition-shadow hover:shadow-md",
        compact && "p-2.5 sm:p-3",
      )}
    >
      {showFavorite && (
        <div className={cn("absolute z-10", compact ? "right-1.5 top-1.5" : "right-2 top-2")}>
          <FavoriteButton code={stock.code} size="sm" />
        </div>
      )}
      <Link href={`/stocks/${stock.code}`} className="group block">
        <div className={cn("flex items-start justify-between gap-2", compact ? "pr-5" : "pr-6")}>
          <div>
            <p
              className={cn(
                "font-medium text-slate-500 dark:text-slate-400",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {stock.market}
              {stock.sector ? ` · ${stock.sector}` : ""}
            </p>
            <h3
              className={cn(
                "font-semibold text-slate-900 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400",
                compact ? "mt-0 text-sm" : "mt-0.5 text-lg",
              )}
            >
              {stock.name}
            </h3>
            <p className={cn("text-slate-400", compact ? "text-[10px]" : "text-xs")}>
              {stock.code}
            </p>
          </div>
          {!compact && (
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-600" />
          )}
        </div>
        <div
          className={cn(
            "flex items-end justify-between gap-2",
            compact ? "mt-2" : "mt-4",
          )}
        >
          <div>
            <p className={cn("text-slate-500 dark:text-slate-400", compact ? "text-[10px]" : "text-xs")}>
              외국인 지분율
            </p>
            <p
              className={cn(
                "font-bold tracking-tight text-slate-900 dark:text-slate-100",
                compact ? "text-lg" : "text-2xl",
              )}
            >
              {formatRatio(stock.currentRatio)}
            </p>
          </div>
          <div className="text-right">
            <p className={cn("text-slate-500 dark:text-slate-400", compact ? "text-[10px]" : "text-xs")}>
              1일 변화
            </p>
            <p
              className={cn(
                "font-semibold",
                changeColor(stock.change1d),
                compact ? "text-xs" : "text-sm",
              )}
            >
              {formatChange(stock.change1d)}
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
