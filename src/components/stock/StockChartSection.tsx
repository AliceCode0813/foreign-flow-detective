"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardTitle } from "@/components/ui/Card";
import { ChartBox } from "@/components/ui/ChartBox";
import { CandlestickChart, normalizeOhlcBar } from "@/components/stock/CandlestickChart";
import type { CombinedHistoryRow, MarketHistoryPoint, OwnershipHistoryPoint } from "@/lib/types";
import {
  cn,
  changeColor,
  formatPercent,
  formatPrice,
  formatRatio,
  formatVolume,
} from "@/lib/utils";

type ChartMode = "candle" | "combined";
type TableMode = "ownership" | "market" | "combined";

const DAY_OPTIONS = [30, 60, 90, 120] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

function formatDateLabel(date: string) {
  const [, m, d] = date.split("-");
  return `${m}/${d}`;
}

function HistoryTable({
  rows,
  mode,
  maxRows,
}: {
  rows: CombinedHistoryRow[];
  mode: TableMode;
  maxRows: number;
}) {
  const display = [...rows].reverse().slice(0, maxRows);

  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
      <table className="w-full min-w-[520px] text-xs">
        <thead className="sticky top-0 bg-white dark:bg-slate-900">
          <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800">
            <th className="px-2 py-2">일자</th>
            {(mode === "ownership" || mode === "combined") && (
              <>
                <th className="px-2 py-2 text-right">외국인지분</th>
                <th className="px-2 py-2 text-right">보유주식</th>
              </>
            )}
            {(mode === "market" || mode === "combined") && (
              <>
                <th className="px-2 py-2 text-right">종가</th>
                <th className="px-2 py-2 text-right">등락</th>
                <th className="px-2 py-2 text-right">거래량</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {display.map((row) => (
            <tr
              key={row.date}
              className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
            >
              <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">{row.date}</td>
              {(mode === "ownership" || mode === "combined") && (
                <>
                  <td className="px-2 py-1.5 text-right font-medium">
                    {formatRatio(row.foreignRatioPct)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-500">
                    {row.foreignShares ? Number(row.foreignShares).toLocaleString("ko-KR") : "-"}
                  </td>
                </>
              )}
              {(mode === "market" || mode === "combined") && (
                <>
                  <td className="px-2 py-1.5 text-right">
                    {row.closePrice != null ? formatPrice(row.closePrice) : "-"}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-medium",
                      changeColor(row.changePct ?? 0),
                    )}
                  >
                    {row.changePct != null ? formatPercent(row.changePct) : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-500">
                    {row.volume ? formatVolume(row.volume) : "-"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StockChartSection({
  ownership,
  market,
  combined,
  stockName,
}: {
  ownership: OwnershipHistoryPoint[];
  market: MarketHistoryPoint[];
  combined: CombinedHistoryRow[];
  stockName: string;
}) {
  const [chartMode, setChartMode] = useState<ChartMode>("candle");
  const [tableMode, setTableMode] = useState<TableMode>("combined");
  const [days, setDays] = useState<DayOption>(60);

  const marketMap = useMemo(() => new Map(market.map((m) => [m.date, m])), [market]);

  const candleData = useMemo(() => {
    return market
      .slice(-days)
      .map((m) => normalizeOhlcBar(m))
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [market, days]);

  const combinedChartData = useMemo(
    () =>
      ownership.slice(-days).map((o) => {
        const m = marketMap.get(o.date);
        return {
          date: o.date,
          label: formatDateLabel(o.date),
          ratio: o.foreignRatioPct,
          close: m?.closePrice ?? null,
        };
      }),
    [ownership, marketMap, days],
  );

  const tableRows = useMemo(() => combined.slice(-days), [combined, days]);

  const hasRealOhlc = market.some(
    (m) => m.openPrice > 0 && m.highPrice > m.lowPrice,
  );
  const canShowCandle = candleData.length >= 2;
  const effectiveChart =
    chartMode === "candle" && canShowCandle ? "candle" : "combined";

  return (
    <Card>
      <CardTitle subtitle={`KRX/pykrx · 최근 ${days}거래일`}>
        {stockName} 차트 & 데이터
      </CardTitle>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setChartMode("candle")}
            disabled={!canShowCandle}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              effectiveChart === "candle"
                ? "bg-white shadow-sm dark:bg-slate-700"
                : "text-slate-600 dark:text-slate-400",
              !canShowCandle && "opacity-40",
            )}
          >
            캔들차트 (KRX)
          </button>
          <button
            type="button"
            onClick={() => setChartMode("combined")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              effectiveChart === "combined"
                ? "bg-white shadow-sm dark:bg-slate-700"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            지분+시세
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>기간</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as DayOption)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>
      </div>

      <ChartBox heightClassName="h-80 min-h-80 sm:h-96">
        {effectiveChart === "candle" ? (
          <CandlestickChart data={candleData} />
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <ComposedChart
              data={combinedChartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis yAxisId="ratio" tickFormatter={(v) => `${v}%`} width={48} />
              <YAxis
                yAxisId="price"
                orientation="right"
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                width={44}
              />
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === "ratio") return [formatRatio(v), "외국인 지분"];
                  if (name === "close") return [formatPrice(v), "종가"];
                  return [value, name];
                }}
              />
              <Line
                yAxisId="ratio"
                type="monotone"
                dataKey="ratio"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="ratio"
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name="close"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartBox>

      {!hasRealOhlc && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          시가·고가·저가 미수집 — `npm.cmd run backfill:market` 실행 후 실제 KRX 캔들이 표시됩니다.
          (현재는 종가 기준으로 표시될 수 있습니다.)
        </p>
      )}

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              { key: "combined", label: "지분+시세 통합" },
              { key: "ownership", label: "지분표" },
              { key: "market", label: "시세표" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTableMode(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tableMode === tab.key
                  ? "bg-white shadow-sm dark:bg-slate-700"
                  : "text-slate-600 dark:text-slate-400",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <HistoryTable rows={tableRows} mode={tableMode} maxRows={days} />
      </div>
    </Card>
  );
}
