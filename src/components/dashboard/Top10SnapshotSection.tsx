import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { RankingEntry } from "@/lib/types";
import type { PeriodTopBottom } from "@/lib/services/ranking-service";
import { cn, formatChange, formatRatio, changeColor } from "@/lib/utils";

function CompactRankingTable({
  entries,
  variant,
}: {
  entries: RankingEntry[];
  variant: "top" | "bottom";
}) {
  const isTop = variant === "top";

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">스냅샷 데이터 없음</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr className="text-left text-xs text-slate-500">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">종목</th>
            <th className="px-3 py-2 text-right">변화</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${variant}-${entry.code}`}
              className="border-t border-slate-50 dark:border-slate-800/50"
            >
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    entry.rank <= 3
                      ? isTop
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/stocks/${entry.code}`}
                  className="font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                >
                  {entry.name}
                </Link>
                <p className="text-[10px] text-slate-400">
                  {formatRatio(entry.currentRatio)}
                </p>
              </td>
              <td className={cn("px-3 py-2 text-right font-semibold", changeColor(entry.change))}>
                {formatChange(entry.change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 사전 계산 TOP10 — 대시보드 우선 로드 */
export function Top10SnapshotSection({
  snapshot,
  marketLabel,
}: {
  snapshot: PeriodTopBottom;
  marketLabel: string;
}) {
  const { top, bottom, tradeDate } = snapshot;

  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · ${marketLabel} · 60일 변화 TOP10 (사전 계산)`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          외국인 지분 TOP10
        </span>
      </CardTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4" />
            증가 TOP10
          </h3>
          <CompactRankingTable entries={top} variant="top" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            감소 TOP10
          </h3>
          <CompactRankingTable entries={bottom} variant="bottom" />
        </div>
      </div>
    </Card>
  );
}
