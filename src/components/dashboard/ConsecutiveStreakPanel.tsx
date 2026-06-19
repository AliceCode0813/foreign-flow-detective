import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { OwnershipSparkline } from "@/components/dashboard/OwnershipSparkline";
import type { ConsecutiveInflowEntry } from "@/lib/types";
import { cn, changeColor, formatChange, formatRatio } from "@/lib/utils";

export function ConsecutiveStreakPanel({
  entries,
  tradeDate,
  marketLabel,
  variant,
}: {
  entries: ConsecutiveInflowEntry[];
  tradeDate: string | null;
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
    <Card className="p-3 sm:p-4">
      <CardTitle
        subtitle={
          tradeDate ? `기준일 ${tradeDate} · ${marketLabel}` : "데이터 없음"
        }
        className="mb-2"
        titleClassName="text-sm"
        subtitleClassName="text-xs"
      >
        <span className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", iconClass)} />
          {title}
        </span>
      </CardTitle>

      {entries.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">{emptyMsg}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] text-slate-500 dark:border-slate-800">
                <th className="w-7 pb-1.5 pr-1 font-medium">#</th>
                <th className="pb-1.5 pr-1 font-medium">종목</th>
                <th className="w-11 pb-1.5 pr-1 text-center font-medium">연속</th>
                <th className="hidden w-14 pb-1.5 pr-1 font-medium sm:table-cell">
                  60일
                </th>
                <th className="w-[3.25rem] pb-1.5 pr-1 text-right font-medium">변화</th>
                <th className="w-[3rem] pb-1.5 text-right font-medium">지분</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.code}
                  className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                >
                  <td className="py-1.5 pr-1 font-bold text-slate-500">{i + 1}</td>
                  <td className="max-w-0 py-1.5 pr-1">
                    <Link
                      href={`/stocks/${entry.code}`}
                      className="block truncate font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100"
                    >
                      {entry.name}
                    </Link>
                    <p className="truncate text-[10px] text-slate-400">{entry.code}</p>
                  </td>
                  <td className="py-1.5 pr-1 text-center">
                    <span
                      className={cn(
                        "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                        badgeClass,
                      )}
                    >
                      {entry.streakDays}일
                    </span>
                  </td>
                  <td className="hidden py-1.5 pr-1 sm:table-cell">
                    <OwnershipSparkline
                      data={entry.ratioHistory60d}
                      width={52}
                      height={20}
                    />
                  </td>
                  <td
                    className={cn(
                      "py-1.5 pr-1 text-right text-[11px] font-semibold tabular-nums",
                      changeColor(entry.change60d),
                    )}
                  >
                    {formatChange(entry.change60d)}
                  </td>
                  <td className="py-1.5 text-right text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
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
