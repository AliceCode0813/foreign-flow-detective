import { BarChart3, Calendar, Globe2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatChange } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types";

export function StatsBar(
  stats: DashboardStats & { marketLabel?: string },
) {
  const label = stats.marketLabel ?? "전체";
  const items = [
    {
      icon: Globe2,
      label: `추적 종목 (${label})`,
      value: `${stats.trackedCount}개`,
      sub: `코스피 ${stats.kospiCount} · 코스닥 ${stats.kosdaqCount}`,
    },
    {
      icon: BarChart3,
      label: "평균 20일 변화",
      value: formatChange(stats.avgChange20d),
      sub: "전체 종목 평균",
    },
    {
      icon: Calendar,
      label: "평균 60일 변화",
      value: formatChange(stats.avgChange60d),
      sub: "전체 종목 평균",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(({ icon: Icon, label, value, sub }) => (
        <Card key={label} className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {value}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>
          </div>
        </Card>
      ))}
      <p className="col-span-full text-right text-[11px] text-slate-400 dark:text-slate-500 sm:col-span-3">
        1일 평균 {formatChange(stats.avgChange1d)} · 5일 평균{" "}
        {formatChange(stats.avgChange5d)} · 마지막 업데이트: {stats.lastUpdated}
      </p>
    </div>
  );
}
