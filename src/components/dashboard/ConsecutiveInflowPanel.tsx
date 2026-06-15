import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { OwnershipSparkline } from "@/components/dashboard/OwnershipSparkline";
import type { ConsecutiveInflowEntry } from "@/lib/types";
import { cn, changeColor, formatChange, formatRatio } from "@/lib/utils";

export function ConsecutiveInflowPanel({
  entries,
  tradeDate,
  marketLabel,
}: {
  entries: ConsecutiveInflowEntry[];
  tradeDate: string | null;
  marketLabel: string;
}) {
  return (
    <Card>
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · 연속 증가일 큰 순 · ${marketLabel}`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          연속 유입 TOP 10
        </span>
      </CardTitle>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          3일 이상 연속 지분 증가 종목이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-slate-800">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">종목</th>
                <th className="pb-2 pr-2 text-center font-medium">연속↑</th>
                <th className="pb-2 pr-2 font-medium">60일 추이</th>
                <th className="pb-2 pr-2 text-right font-medium">60일 변화</th>
                <th className="pb-2 text-right font-medium">현재 지분</th>
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
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
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
