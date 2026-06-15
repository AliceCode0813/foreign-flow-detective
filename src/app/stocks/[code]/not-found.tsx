import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function StockNotFound() {
  return (
    <AppShell>
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          종목을 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          DB에 등록·수집된 종목만 조회할 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          대시보드로 이동
        </Link>
      </div>
    </AppShell>
  );
}
