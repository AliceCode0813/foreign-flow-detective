"use client";

import { useEffect, useRef, useState } from "react";

type CandlePoint = {
  date: string;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** 반응형 KRX 캔들차트 (SVG) */
export function CandlestickChart({ data }: { data: CandlePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 320 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        캔들차트 데이터가 부족합니다.
      </div>
    );
  }

  const padL = 56;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const chartW = size.width - padL - padR;
  const chartH = size.height - padT - padB;

  const lows = data.map((d) => d.low);
  const highs = data.map((d) => d.high);
  const min = Math.min(...lows) * 0.995;
  const max = Math.max(...highs) * 1.005;
  const range = max - min || 1;

  const y = (price: number) => padT + chartH - ((price - min) / range) * chartH;
  const step = chartW / data.length;
  const candleW = Math.max(Math.min(step * 0.65, 14), 3);

  const labelEvery = Math.max(1, Math.floor(data.length / 8));

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={size.width} height={size.height} role="img" aria-label="캔들차트">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const price = min + range * (1 - t);
          const yy = padT + chartH * t;
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={size.width - padR}
                y1={yy}
                y2={yy}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeDasharray="4 4"
              />
              <text
                x={padL - 6}
                y={yy + 4}
                textAnchor="end"
                fontSize="11"
                className="fill-slate-400"
              >
                {Math.round(price).toLocaleString("ko-KR")}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padL + step * i + step / 2;
          const up = d.close >= d.open;
          const color = up ? "#10b981" : "#ef4444";
          const bodyTop = y(Math.max(d.open, d.close));
          const bodyBottom = y(Math.min(d.open, d.close));
          const bodyH = Math.max(bodyBottom - bodyTop, 1.5);
          return (
            <g key={d.date}>
              <title>
                {`${d.date} 시${d.open.toLocaleString()} 고${d.high.toLocaleString()} 저${d.low.toLocaleString()} 종${d.close.toLocaleString()}`}
              </title>
              <line
                x1={cx}
                x2={cx}
                y1={y(d.high)}
                y2={y(d.low)}
                stroke={color}
                strokeWidth={1.2}
              />
              <rect
                x={cx - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={up ? color : "#ffffff"}
                stroke={color}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={`x-${d.date}`}
              x={padL + step * i + step / 2}
              y={size.height - 8}
              textAnchor="middle"
              fontSize="11"
              className="fill-slate-400"
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function normalizeOhlcBar(m: {
  date: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
}) {
  const close = m.closePrice;
  if (close <= 0) return null;
  const open = m.openPrice > 0 ? m.openPrice : close;
  const high = m.highPrice > 0 ? Math.max(m.highPrice, open, close) : Math.max(open, close);
  const low = m.lowPrice > 0 ? Math.min(m.lowPrice, open, close) : Math.min(open, close);
  const [, mm, dd] = m.date.split("-");
  return {
    date: m.date,
    label: `${mm}/${dd}`,
    open,
    high,
    low,
    close,
  };
}
