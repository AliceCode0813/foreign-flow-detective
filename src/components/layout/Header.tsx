import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { InvestorNav } from "./InvestorNav";

export function Header({ hasData = false }: { hasData?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Foreign Flow Detective
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              외국인 지분율 추적
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <InvestorNav />
          <span
            className={
              hasData
                ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800"
                : "rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800"
            }
          >
            {hasData ? "Live · DB" : "No Data"}
          </span>
        </nav>
      </div>
    </header>
  );
}
