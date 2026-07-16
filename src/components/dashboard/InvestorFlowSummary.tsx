import Link from "next/link";
import type { ReactNode } from "react";
import { changeColor, cn, formatNetValue } from "@/lib/utils";
import type { InvestorDayFlowSummary } from "@/lib/services/investor-ranking-service";

function SummaryCard({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-4",
        className,
      )}
    >
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** 당일 순매수 흐름 요약 — null 항목은 렌더하지 않음 */
export function InvestorFlowSummary({
  summary,
  investorLabel = "개인",
}: {
  summary: InvestorDayFlowSummary;
  investorLabel?: string;
}) {
  const cards: ReactNode[] = [];

  if (summary.totalNet != null) {
    cards.push(
      <SummaryCard key="total" label={`오늘 ${investorLabel} 순매수 총액`}>
        <p
          className={cn(
            "text-lg font-bold tabular-nums tracking-tight sm:text-xl",
            changeColor(summary.totalNet),
          )}
        >
          {formatNetValue(summary.totalNet)}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">기준일 {summary.tradeDate}</p>
      </SummaryCard>,
    );
  }

  if (summary.buyCount != null) {
    cards.push(
      <SummaryCard key="buy" label="순매수 종목 수">
        <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-xl">
          {summary.buyCount.toLocaleString()}
          <span className="ml-0.5 text-sm font-medium text-slate-500">종목</span>
        </p>
      </SummaryCard>,
    );
  }

  if (summary.sellCount != null) {
    cards.push(
      <SummaryCard key="sell" label="순매도 종목 수">
        <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400 sm:text-xl">
          {summary.sellCount.toLocaleString()}
          <span className="ml-0.5 text-sm font-medium text-slate-500">종목</span>
        </p>
      </SummaryCard>,
    );
  }

  if (summary.topBuy) {
    cards.push(
      <SummaryCard key="top" label="최대 순매수 종목">
        <Link
          href={`/stocks/${summary.topBuy.code}`}
          className="block truncate text-base font-semibold text-slate-900 hover:text-blue-700 dark:text-slate-100 sm:text-lg"
        >
          {summary.topBuy.name}
        </Link>
        <p
          className={cn(
            "mt-0.5 text-sm font-semibold tabular-nums",
            changeColor(summary.topBuy.netValue),
          )}
        >
          {formatNetValue(summary.topBuy.netValue)}
        </p>
      </SummaryCard>,
    );
  }

  if (cards.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-3",
        cards.length === 1 && "grid-cols-1",
        cards.length === 2 && "grid-cols-2",
        cards.length === 3 && "grid-cols-2 sm:grid-cols-3",
        cards.length >= 4 && "grid-cols-2 lg:grid-cols-4",
      )}
    >
      {cards}
    </div>
  );
}
