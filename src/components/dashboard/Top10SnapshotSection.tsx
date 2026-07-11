import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { RankingEntry } from "@/lib/types";
import type { PeriodTopBottom } from "@/lib/services/ranking-service";
import { cn, formatChange, formatNetValue, formatRatio, changeColor } from "@/lib/utils";

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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[450px] text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10px] text-slate-500 dark:border-slate-800">
            <th className="w-7 pb-1.5 pr-1 font-medium">#</th>
            <th className="pb-1.5 pr-1 font-medium">종목</th>
            <th className="w-[3.25rem] pb-1.5 pr-1 text-right font-medium">변화</th>
            <th className="w-[3.4rem] pb-1.5 pr-1 text-right font-medium">5일</th>
            <th className="w-[3.4rem] pb-1.5 pr-1 text-right font-medium">20일</th>
            <th className="w-[3.4rem] pb-1.5 text-right font-medium">60일</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${variant}-${entry.code}`}
              className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
            >
              <td className="py-1.5 pr-1">
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
              <td className="max-w-0 py-1.5 pr-1">
                <Link
                  href={`/stocks/${entry.code}`}
                  className="block truncate font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                >
                  {entry.name}
                </Link>
                <p className="truncate text-[10px] text-slate-400">
                  지분 {formatRatio(entry.currentRatio)}
                </p>
              </td>
              <td
                className={cn(
                  "py-1.5 pr-1 text-right text-[11px] font-semibold tabular-nums",
                  changeColor(entry.change),
                )}
              >
                {formatChange(entry.change)}
              </td>
              <td
                className={cn(
                  "py-1.5 pr-1 text-right text-[11px] font-semibold tabular-nums",
                  entry.netPurchase5d != null ? changeColor(entry.netPurchase5d) : "text-slate-400",
                )}
              >
                {entry.netPurchase5d != null ? formatNetValue(entry.netPurchase5d) : "—"}
              </td>
              <td
                className={cn(
                  "py-1.5 pr-1 text-right text-[11px] font-semibold tabular-nums",
                  entry.netPurchase20d != null
                    ? changeColor(entry.netPurchase20d)
                    : "text-slate-400",
                )}
              >
                {entry.netPurchase20d != null ? formatNetValue(entry.netPurchase20d) : "—"}
              </td>
              <td
                className={cn(
                  "py-1.5 text-right text-[11px] font-semibold tabular-nums",
                  entry.netPurchase60d != null
                    ? changeColor(entry.netPurchase60d)
                    : "text-slate-400",
                )}
              >
                {entry.netPurchase60d != null ? formatNetValue(entry.netPurchase60d) : "—"}
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
            ? `기준일 ${tradeDate} · ${marketLabel} · 60일 지분 변화 TOP10`
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
