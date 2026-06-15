import { Card, CardTitle } from "@/components/ui/Card";
import type { StockInvestmentInfo } from "@/lib/types";
import {
  formatMarketCap,
  formatPercent,
  formatPrice,
  formatRatio,
  changeColor,
  cn,
} from "@/lib/utils";

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          "text-right text-sm font-semibold text-slate-900 dark:text-slate-100",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** KRX/pykrx 투자 정보 패널 */
export function StockInvestmentPanel({
  info,
  stockName,
}: {
  info: StockInvestmentInfo | null;
  stockName: string;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardTitle subtitle={info ? `기준일 ${info.tradeDate} · KRX/pykrx` : "데이터 없음"}>
        {stockName} 투자정보
      </CardTitle>

      {!info ? (
        <p className="py-6 text-center text-sm text-slate-500">
          투자지표가 없습니다.
          <br />
          <span className="text-xs">
            `npm.cmd run backfill:market` 또는 `npm.cmd run update:daily` 실행 후 PER·PBR 등이
            표시됩니다. (유료 아님 · pykrx/KRX 무료 데이터)
          </span>
        </p>
      ) : (
        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
          <InfoRow label="시가총액" value={formatMarketCap(info.marketCap)} />
          <InfoRow
            label="현재가 (종가)"
            value={info.closePrice > 0 ? `${formatPrice(info.closePrice)}원` : "-"}
          />
          <InfoRow
            label="전일 대비"
            value={formatPercent(info.changePct)}
            valueClassName={changeColor(info.changePct)}
          />
          <InfoRow
            label="상장주식수"
            value={
              info.listedShares > 0
                ? `${Math.round(info.listedShares / 1_000_000).toLocaleString("ko-KR")}백만주`
                : "-"
            }
          />
          <InfoRow label="액면가" value={info.parValue ? `${formatPrice(info.parValue)}원` : "미제공"} />
          <InfoRow label="PER" value={info.per != null ? `${info.per.toFixed(2)}배` : "-"} />
          <InfoRow label="PBR" value={info.pbr != null ? `${info.pbr.toFixed(2)}배` : "-"} />
          <InfoRow
            label="EPS"
            value={info.eps != null ? `${formatPrice(info.eps)}원` : "-"}
          />
          <InfoRow
            label="BPS"
            value={info.bps != null ? `${formatPrice(info.bps)}원` : "-"}
          />
          <InfoRow
            label="배당수익률"
            value={info.divYield != null ? formatRatio(info.divYield) : "-"}
          />
          <InfoRow
            label="DPS"
            value={info.dps != null ? `${formatPrice(info.dps)}원` : "-"}
          />
          {info.tradingValue != null && (
            <InfoRow
              label="거래대금"
              value={formatMarketCap(info.tradingValue)}
            />
          )}
        </div>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
        한국거래소(pykrx) 일별 시세·시총·재무지표입니다. 액면가는 별도 상장정보 연동 전까지
        미표시됩니다.
      </p>
    </Card>
  );
}
