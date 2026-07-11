import Link from "next/link";
import { getMinimalDashboardMeta } from "@/lib/services/stock-service";
import { marketFilterLabel } from "@/lib/market";
import type { MarketFilter } from "@/lib/types";

/** 홈 제목 아래 메타 — TOP10 이후 스트리밍 */
export async function DeferredHomeMeta({ market }: { market: MarketFilter }) {
  const meta = await getMinimalDashboardMeta();
  const marketLabel = marketFilterLabel(market);

  return (
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
      {marketLabel} · {meta.trackedCount.toLocaleString()}종목 ·{" "}
      {meta.hasData ? meta.lastUpdated : "데이터 없음"}
      {" · "}
      <Link href="/explore" className="underline-offset-2 hover:underline">
        지분 변동 탐색
      </Link>
    </p>
  );
}

export function DeferredHomeMetaFallback({ market }: { market: MarketFilter }) {
  const marketLabel = marketFilterLabel(market);
  return (
    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
      {marketLabel} · 불러오는 중…
    </p>
  );
}
