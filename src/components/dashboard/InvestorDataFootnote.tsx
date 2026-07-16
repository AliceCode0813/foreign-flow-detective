import type { InvestorDayFlowSummary } from "@/lib/services/investor-ranking-service";

/** 데이터 출처·기준일·계산 방식 안내 */
export function InvestorDataFootnote({
  tradeDate,
  trackedCount,
  investorLabel = "개인",
}: {
  tradeDate: string | null;
  trackedCount?: number;
  investorLabel?: string;
  /** optional: unused but allows passing summary tradeDate */
  summary?: InvestorDayFlowSummary | null;
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
      <p className="font-semibold text-slate-800 dark:text-slate-200">데이터 안내</p>
      <ul className="mt-1.5 list-inside list-disc space-y-1">
        <li>
          <span className="font-medium text-slate-700 dark:text-slate-300">출처</span>
          : KRX 투자자별 매매대금(순매수) · pykrx 수집 · Supabase 저장
        </li>
        <li>
          <span className="font-medium text-slate-700 dark:text-slate-300">기준일</span>
          : {tradeDate ?? "데이터 없음"}
          {trackedCount != null
            ? ` · 추적 ${trackedCount.toLocaleString()}종목`
            : null}
        </li>
        <li>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            최종 반영
          </span>
          : 평일 새벽 자동 수집(약 03:17 KST) 후 페이지 캐시 최대 약 10분
        </li>
        <li>
          <span className="font-medium text-slate-700 dark:text-slate-300">계산</span>
          : {investorLabel} 누적 순매수 = 일별 순매수 합(1/5/20/60거래일). 「외국인
          지분」열은 동일 기간 외국인 지분율 변화(%p)이며 {investorLabel} 지분이
          아닙니다. 상단 총액·종목 수는 기준일 {investorLabel}{" "}
          <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">
            investor_trading_daily
          </code>{" "}
          집계입니다.
        </li>
      </ul>
    </aside>
  );
}
