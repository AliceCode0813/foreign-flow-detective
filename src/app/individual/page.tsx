import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getMinimalDashboardMeta } from "@/lib/services/stock-service";
import { User } from "lucide-react";

export default async function IndividualPage() {
  const meta = await getMinimalDashboardMeta();

  return (
    <AppShell hasData={meta.hasData}>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          개인 매매 동향
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          개인 투자자 순매수·순매도 추적
        </p>
      </section>

      <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-900">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </span>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          준비 중
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          데이터 수집 준비 중입니다. 외국인 지분 대시보드는 계속 이용 가능합니다.
        </p>
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-slate-700 underline underline-offset-4 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          외국인 지분 대시보드로 이동
        </Link>
      </div>
    </AppShell>
  );
}
