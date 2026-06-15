"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/Card";
import type { MarketHistoryPoint, OwnershipHistoryPoint } from "@/lib/types";
import { formatPrice, formatRatio, formatVolume } from "@/lib/utils";

interface StockDetailChartProps {
  ownership: OwnershipHistoryPoint[];
  market: MarketHistoryPoint[];
  stockName: string;
}

function formatDateLabel(date: string) {
  const [, m, d] = date.split("-");
  return `${m}/${d}`;
}

/** 외국인 지분율 + 종가 + 거래량 복합 차트 */
export function StockDetailChart({
  ownership,
  market,
  stockName,
}: StockDetailChartProps) {
  const marketMap = new Map(market.map((m) => [m.date, m]));

  const chartData = ownership.slice(-60).map((o) => {
    const mkt = marketMap.get(o.date);
    return {
      date: o.date,
      label: formatDateLabel(o.date),
      ratio: o.foreignRatioPct,
      close: mkt?.closePrice ?? null,
      volume: mkt ? Number(mkt.volume) : null,
    };
  });

  const ratios = chartData.map((d) => d.ratio);
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  const closes = chartData.map((d) => d.close).filter((v): v is number => v !== null);
  const minClose = closes.length ? Math.min(...closes) : 0;
  const maxClose = closes.length ? Math.max(...closes) : 0;

  return (
    <Card>
      <CardTitle subtitle="최근 60거래일 · 지분율(%) · 종가(원) · 거래량">
        {stockName} 외국인 지분 & 시세
      </CardTitle>
      <div className="h-80 min-h-80 w-full min-w-0 sm:h-96">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="ratioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-700"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="text-slate-500"
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              yAxisId="ratio"
              domain={[minRatio - 0.5, maxRatio + 0.5]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              domain={[minClose * 0.98, maxClose * 1.02]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              width={44}
            />
            <YAxis yAxisId="volume" hide domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value, name) => {
                const v = Number(value);
                if (name === "ratio") return [formatRatio(v), "외국인 지분"];
                if (name === "close") return [formatPrice(v), "종가"];
                if (name === "volume") return [formatVolume(String(v)), "거래량"];
                return [value, name];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as { date?: string };
                return item?.date ?? "";
              }}
            />
            <Area
              yAxisId="ratio"
              type="monotone"
              dataKey="ratio"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#ratioFill)"
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
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#94a3b8"
              opacity={0.35}
              name="volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-blue-600" /> 외국인 지분율
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-amber-500" /> 종가
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-slate-400/50" /> 거래량
        </span>
      </div>
    </Card>
  );
}
