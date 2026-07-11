"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice, formatRatio } from "@/lib/utils";

export function CombinedRatioPriceChart({
  data,
}: {
  data: { date: string; label: string; ratio: number; close: number | null }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
  );
}
