import Link from "next/link";
import { Zap } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { InferenceBadge } from "@/components/dashboard/InferenceBadge";
import type { OwnershipMoverRow } from "@/lib/types";
import {
  cn,
  formatChange,
  formatMarketCap,
  formatPercent,
  formatRatio,
  changeColor,
} from "@/lib/utils";

/** 장 마감 후 1일 외국인 지분 급변 TOP 10 */
export function DailyVolatilityPanel({
  movers,
  tradeDate,
  marketLabel,
}: {
  movers: OwnershipMoverRow[];
  tradeDate: string | null;
  marketLabel: string;
}) {
  return (
    <Card className="border-orange-200/80 bg-gradient-to-br from-white to-orange-50/40 dark:border-orange-900/50 dark:from-slate-900 dark:to-orange-950/20">
      <CardTitle
        subtitle={
          tradeDate
            ? `기준일 ${tradeDate} · |1일 변화| 큰 순 (${marketLabel})`
            : "데이터 없음"
        }
      >
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          오늘 외국인 지분 급변 TOP 10
        </span>
      </CardTitle>

      {movers.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          1일 변동 데이터가 없습니다. ingest 실행 후 확인하세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-slate-800">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">종목</th>
                <th className="pb-2 pr-2 text-right font-medium">시총</th>
                <th className="pb-2 pr-2 text-right font-medium">전일주가</th>
                <th className="pb-2 pr-2 text-right font-medium">현재 지분</th>
                <th className="pb-2 pr-2 text-right font-medium">1일 변화</th>
                <th className="pb-2 font-medium">추정</th>
              </tr>
            </thead>
            <tbody>
              {movers.map((entry, i) => (
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
                    <p className="text-[11px] text-slate-400">
                      {entry.code} · {entry.market}
                    </p>
                  </td>
                  <td className="py-2.5 pr-2 text-right text-slate-700 dark:text-slate-300">
                    {formatMarketCap(entry.marketCap)}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 pr-2 text-right font-medium",
                      changeColor(entry.priceChange1d),
                    )}
                  >
                    {formatPercent(entry.priceChange1d)}
                  </td>
                  <td className="py-2.5 pr-2 text-right text-slate-700 dark:text-slate-300">
                    {formatRatio(entry.currentRatio)}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 pr-2 text-right text-base font-bold",
                      changeColor(entry.change1d),
                    )}
                  >
                    {formatChange(entry.change1d)}
                  </td>
                  <td className="py-2.5">
                    <InferenceBadge inference={entry.inference} />
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
