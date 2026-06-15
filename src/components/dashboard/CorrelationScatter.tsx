"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { GitCompare } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { ChartBox } from "@/components/ui/ChartBox";
import type { CorrelationPoint } from "@/lib/types";
import { formatChange, formatPercent } from "@/lib/utils";

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CorrelationPoint }[];
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
      <p className="text-slate-500">60일 지분 {formatChange(p.change60d)}</p>
      <p className="text-slate-500">60일 주가 {formatPercent(p.priceChange60d)}</p>
    </div>
  );
}

export function CorrelationScatter({
  points,
  marketLabel,
}: {
  points: CorrelationPoint[];
  marketLabel: string;
}) {
  return (
    <Card>
      <CardTitle subtitle={`60일 지분 변화 vs 60일 주가 변화 · ${marketLabel}`}>
        <span className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-violet-500" />
          지분·주가 상관관계
        </span>
      </CardTitle>

      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">표시할 데이터가 없습니다.</p>
      ) : (
        <ChartBox heightClassName="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                type="number"
                dataKey="priceChange60d"
                name="주가"
                unit="%"
                tick={{ fontSize: 11 }}
                label={{ value: "60일 주가", position: "insideBottom", offset: -4, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="change60d"
                name="지분"
                unit="%p"
                tick={{ fontSize: 11 }}
                width={42}
                label={{ value: "60일 지분", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="marketCap" range={[24, 120]} />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter
                name="종목"
                data={points}
                fill="#8b5cf6"
                fillOpacity={0.65}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartBox>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        우상단: 지분·주가 동반 상승 · 좌상단: 지분↑ 주가↓ · 점 크기: 시총
      </p>
    </Card>
  );
}
