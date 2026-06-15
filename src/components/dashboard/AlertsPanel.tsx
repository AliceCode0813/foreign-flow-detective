import { Bell } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import type { AlertRecord } from "@/lib/types";
import Link from "next/link";

/** 최근 알림 패널 (Priority 5 출력) */
export function AlertsPanel({ alerts }: { alerts: AlertRecord[] }) {
  return (
    <Card>
      <CardTitle subtitle="ingest 시 자동 평가">
        <span className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-500" />
          최근 알림
        </span>
      </CardTitle>
      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          알림 없음
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="rounded-lg border border-slate-100 p-3 dark:border-slate-800"
            >
              <Link
                href={`/stocks/${alert.stockCode}`}
                className="text-sm font-medium text-slate-900 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-400"
              >
                {alert.stockName}
              </Link>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {alert.message}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {alert.tradeDate} · {alert.alertType}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
