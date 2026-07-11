import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { InvestorRankingEntry } from "@/lib/types";
import type { InvestorPeriodTopBottom } from "@/lib/services/investor-ranking-service";
import { cn, changeColor, formatChange, formatNetValue } from "@/lib/utils";

function CompactInvestorRankingTable({
  entries,
  variant,
}: {
  entries: InvestorRankingEntry[];
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
            <th className="px-3 py-2 text-right">누적 순매수</th>
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
                  당일 {formatNetValue(entry.currentValue)}
                </p>
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-semibold",
                  entry.ownershipChange != null
                    ? changeColor(entry.ownershipChange)
                    : "text-slate-400",
                )}
              >
                {entry.ownershipChange != null ? formatChange(entry.ownershipChange) : "—"}
              </td>
              <td
                className={cn("px-3 py-2 text-right font-semibold", changeColor(entry.change))}
              >
                {formatNetValue(entry.change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvestorTop10SnapshotSection({
  snapshot,
  marketLabel,
  title,
}: {
  snapshot: InvestorPeriodTopBottom;
  marketLabel: string;
  title: string;
}) {
  const { top, bottom, tradeDate } = snapshot;

  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · ${marketLabel} · 60일 누적 순매수 TOP10`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          {title} TOP10
        </span>
      </CardTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-4 w-4" />
            순매수 TOP10
          </h3>
          <CompactInvestorRankingTable entries={top} variant="top" />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <TrendingDown className="h-4 w-4" />
            순매도 TOP10
          </h3>
          <CompactInvestorRankingTable entries={bottom} variant="bottom" />
        </div>
      </div>
    </Card>
  );
}
