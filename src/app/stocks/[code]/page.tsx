import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChangeRateCards } from "@/components/stock/ChangeRateCards";
import { StockChartSection } from "@/components/stock/StockChartSection";
import { StockInvestmentPanel } from "@/components/stock/StockInvestmentPanel";
import { StockOverviewPanel } from "@/components/stock/StockOverviewPanel";
import { FavoriteButton } from "@/components/stock/FavoriteButton";
import {
  buildCombinedHistory,
  buildPeriodChanges,
  getStockDetail,
  getStockHistory,
  getStockInvestmentInfo,
} from "@/lib/services/stock-service";
import {
  formatMarketCap,
  formatPercent,
  formatPercentile,
  formatPrice,
  formatRatio,
  changeColor,
  cn,
} from "@/lib/utils";

interface StockDetailPageProps {
  params: Promise<{ code: string }>;
}

export const revalidate = 300;

export async function generateMetadata({ params }: StockDetailPageProps) {
  const { code } = await params;
  const stock = await getStockDetail(code);
  if (!stock) return { title: "종목 없음" };
  return {
    title: `${stock.name} (${stock.code}) | Foreign Flow Detective`,
    description: `${stock.name} 외국인 지분율 추이`,
  };
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { code } = await params;
  const [stock, history, investment] = await Promise.all([
    getStockDetail(code),
    getStockHistory(code, 60),
    getStockInvestmentInfo(code),
  ]);

  if (!stock) {
    notFound();
  }

  const periodChanges = buildPeriodChanges(stock);
  const combined = buildCombinedHistory(history.ownership, history.market);

  return (
    <AppShell hasData={true}>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ChevronLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {stock.market}
              {stock.sector ? ` · ${stock.sector}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              {stock.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stock.code}</p>
          </div>
          <FavoriteButton code={stock.code} />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatRatio(stock.currentRatio)}
              <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
                외국인 지분율
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-400">기준일 {stock.lastTradeDate}</p>
            {stock.foreignRatioPercentile != null && (
              <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                지분율 백분위 {formatPercentile(stock.foreignRatioPercentile)}
              </p>
            )}
          </div>
          {stock.marketCap > 0 && (
            <div>
              <p className="text-xs text-slate-500">시가총액</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatMarketCap(stock.marketCap)}
              </p>
            </div>
          )}
          {stock.closePrice > 0 && (
            <div>
              <p className="text-xs text-slate-500">종가</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatPrice(stock.closePrice)}원
                <span className={cn("ml-2 text-sm font-semibold", changeColor(stock.changePct))}>
                  {formatPercent(stock.changePct)}
                </span>
              </p>
            </div>
          )}
        </div>
      </header>

      <StockOverviewPanel overview={stock.overview} stockName={stock.name} />

      <section className="mb-6">
        <ChangeRateCards changes={periodChanges} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StockChartSection
            stockCode={stock.code}
            ownership={history.ownership}
            market={history.market}
            combined={combined}
            stockName={stock.name}
          />
        </div>
        <div>
          <StockInvestmentPanel info={investment} stockName={stock.name} />
        </div>
      </section>
    </AppShell>
  );
}
