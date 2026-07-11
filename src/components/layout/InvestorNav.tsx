"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "외국인" },
  { href: "/institutional", label: "기관" },
  { href: "/individual", label: "개인" },
] as const;

export function InvestorNav() {
  const pathname = usePathname();

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 sm:gap-1 sm:p-1">
      {LINKS.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? "whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-[13px] font-semibold text-slate-900 shadow-sm underline decoration-slate-400 underline-offset-4 dark:bg-slate-900 dark:text-slate-100 dark:decoration-slate-500 sm:px-3 sm:text-sm"
                : "whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 sm:px-3 sm:text-sm"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
