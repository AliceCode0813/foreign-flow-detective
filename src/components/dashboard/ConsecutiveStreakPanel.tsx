import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { MarketFilterLinks } from "@/components/dashboard/MarketFilterLinks";
import { OwnershipSparkline } from "@/components/dashboard/OwnershipSparkline";
import type { ConsecutiveInflowEntry, MarketFilter } from "@/lib/types";
import { cn, changeColor, formatChange, formatRatio } from "@/lib/utils";

export function ConsecutiveStreakPanel({
  entries,
  tradeDate,
  market,
  marketLabel,
  variant,
}: {
  entries: ConsecutiveInflowEntry[];
  tradeDate: string | null;
  market: MarketFilter;
  marketLabel: string;
  variant: "inflow" | "outflow";
}) {
  const isInflow = variant === "inflow";
  const title = isInflow ? "연속 유입 TOP 10" : "연속 유출 TOP 10";
  const Icon = isInflow ? TrendingUp : TrendingDown;
  const iconClass = isInflow ? "text-emerald-500" : "text-rose-500";
  const badgeClass = isInflow
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
    : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200";
  const emptyMsg = isInflow
    ? "3일 이상 연속 지분 증가 종목이 없습니다."
    : "3일 이상 연속 지분 감소 종목이 없습니다.";

  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · ${marketLabel}`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconClass)} />
          {title}
        </span>
      </CardTitle>

      {isInflow && (
        <div className="mb-4">
          <MarketFilterLinks current={market} pathname="/" />
        </div>
      )}

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{emptyMsg}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-slate-800">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">종목</th>
                <th className="pb-2 pr-2 text-center font-medium">연속</th>
                <th className="pb-2 pr-2 font-medium">60일</th>
                <th className="pb-2 pr-2 text-right font-medium">60일 변화</th>
                <th className="pb-2 text-right font-medium">지분</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.code}
                  className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                >
                  <td className="py-2.5 pr-2 font-bold text-slate-500">{i + 1}</td>
                  <td className="py-2.5 pr-2">
                    <Link
                      href={`/stocks/${entry.code}`}
                      className="font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                    >
                      {entry.name}
                    </Link>
                    <p className="text-[11px] text-slate-400">{entry.code}</p>
                  </td>
                  <td className="py-2.5 pr-2 text-center">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        badgeClass,
                      )}
                    >
                      {entry.streakDays}일
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <OwnershipSparkline data={entry.ratioHistory60d} />
                  </td>
                  <td
                    className={cn(
                      "py-2.5 pr-2 text-right font-semibold",
                      changeColor(entry.change60d),
                    )}
                  >
                    {formatChange(entry.change60d)}
                  </td>
                  <td className="py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {formatRatio(entry.currentRatio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
