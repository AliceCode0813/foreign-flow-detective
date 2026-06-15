import { Grid3x3 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { SectorHeatmapCell } from "@/lib/types";
import { cn, changeColor, formatChange } from "@/lib/utils";

function heatBg(value: number): string {
  if (value >= 0.3) return "bg-emerald-500/90 text-white";
  if (value >= 0.1) return "bg-emerald-400/80 text-white";
  if (value > 0) return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
  if (value <= -0.3) return "bg-rose-500/90 text-white";
  if (value <= -0.1) return "bg-rose-400/80 text-white";
  if (value < 0) return "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export function SectorHeatmap({
  cells,
  marketLabel,
}: {
  cells: SectorHeatmapCell[];
  marketLabel: string;
}) {
  const top = cells.slice(0, 12);

  return (
    <Card>
      <CardTitle subtitle={`60일 평균 지분 변화 · ${marketLabel}`}>
        <span className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-teal-500" />
          시장·업종 히트맵
        </span>
      </CardTitle>

      {top.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">표시할 데이터가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {top.map((cell) => (
            <div
              key={cell.label}
              className={cn(
                "rounded-lg px-3 py-2.5 transition-colors",
                heatBg(cell.avgChange60d),
              )}
            >
              <p className="truncate text-xs font-semibold">{cell.label}</p>
              <p className={cn("mt-0.5 text-sm font-bold", changeColor(cell.avgChange60d))}>
                {formatChange(cell.avgChange60d)}
              </p>
              <p className="mt-0.5 text-[10px] opacity-80">{cell.count}종목</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
