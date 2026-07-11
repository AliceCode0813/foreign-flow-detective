"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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

const CombinedRatioPriceChart = dynamic(
  () =>
    import("@/components/stock/CombinedRatioPriceChart").then((m) => m.CombinedRatioPriceChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        차트 로딩…
      </div>
    ),
  },
);

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

function mergeCombined(
  ownership: OwnershipHistoryPoint[],
  market: MarketHistoryPoint[],
): CombinedHistoryRow[] {
  const marketMap = new Map(market.map((m) => [m.date, m]));
  return ownership.map((o) => {
    const m = marketMap.get(o.date);
    return {
      date: o.date,
      foreignRatioPct: o.foreignRatioPct,
      foreignShares: o.foreignShares,
      openPrice: m?.openPrice ?? null,
      highPrice: m?.highPrice ?? null,
      lowPrice: m?.lowPrice ?? null,
      closePrice: m?.closePrice ?? null,
      volume: m?.volume ?? null,
      changePct: m?.changePct ?? null,
    };
  });
}

export function StockChartSection({
  stockCode,
  ownership: initialOwnership,
  market: initialMarket,
  combined: initialCombined,
  stockName,
}: {
  stockCode: string;
  ownership: OwnershipHistoryPoint[];
  market: MarketHistoryPoint[];
  combined: CombinedHistoryRow[];
  stockName: string;
}) {
  const [chartMode, setChartMode] = useState<ChartMode>("candle");
  const [tableMode, setTableMode] = useState<TableMode>("combined");
  const [days, setDays] = useState<DayOption | "all">(60);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [ownership, setOwnership] = useState(initialOwnership);
  const [market, setMarket] = useState(initialMarket);
  const [combined, setCombined] = useState(initialCombined);

  const loadFullHistory = useCallback(async () => {
    if (fullLoaded || loadingFull) return;
    setLoadingFull(true);
    try {
      const res = await fetch(`/api/stocks/${stockCode}/history?days=all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        ownership: OwnershipHistoryPoint[];
        market: MarketHistoryPoint[];
      };
      setOwnership(data.ownership);
      setMarket(data.market);
      setCombined(mergeCombined(data.ownership, data.market));
      setFullLoaded(true);
      setDays("all");
    } catch {
      /* keep partial data */
    } finally {
      setLoadingFull(false);
    }
  }, [stockCode, fullLoaded, loadingFull]);

  const marketMap = useMemo(() => new Map(market.map((m) => [m.date, m])), [market]);

  const sliceCount = days === "all" ? ownership.length : days;

  const candleData = useMemo(() => {
    return market
      .slice(-sliceCount)
      .map((m) => normalizeOhlcBar(m))
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [market, sliceCount]);

  const combinedChartData = useMemo(
    () =>
      ownership.slice(-sliceCount).map((o) => {
        const m = marketMap.get(o.date);
        return {
          date: o.date,
          label: formatDateLabel(o.date),
          ratio: o.foreignRatioPct,
          close: m?.closePrice ?? null,
        };
      }),
    [ownership, marketMap, sliceCount],
  );

  const tableRows = useMemo(() => combined.slice(-sliceCount), [combined, sliceCount]);

  const hasRealOhlc = market.some(
    (m) => m.openPrice > 0 && m.highPrice > m.lowPrice,
  );
  const canShowCandle = candleData.length >= 2;
  const effectiveChart =
    chartMode === "candle" && canShowCandle ? "candle" : "combined";

  const periodLabel = days === "all" ? "전체" : `${days}거래일`;

  return (
    <Card>
      <CardTitle subtitle={`DB 저장 데이터 · ${periodLabel}`}>
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
            캔들차트
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
            value={days === "all" ? "all" : days}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") {
                if (!fullLoaded) void loadFullHistory();
                else setDays("all");
              } else {
                setDays(Number(v) as DayOption);
              }
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
            <option value="all">전체 기간</option>
          </select>
          {!fullLoaded && (
            <button
              type="button"
              onClick={() => void loadFullHistory()}
              disabled={loadingFull}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              {loadingFull && <Loader2 className="h-3 w-3 animate-spin" />}
              전체 기간 불러오기
            </button>
          )}
        </div>
      </div>

      <ChartBox heightClassName="h-80 min-h-80 sm:h-96">
        {effectiveChart === "candle" ? (
          <CandlestickChart data={candleData} />
        ) : (
          <CombinedRatioPriceChart data={combinedChartData} />
        )}
      </ChartBox>

      {!hasRealOhlc && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          시가·고가·저가 미수집 — backfill:market 실행 후 캔들차트가 표시됩니다.
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
        <HistoryTable
          rows={tableRows}
          mode={tableMode}
          maxRows={days === "all" ? tableRows.length : days}
        />
      </div>
    </Card>
  );
}
