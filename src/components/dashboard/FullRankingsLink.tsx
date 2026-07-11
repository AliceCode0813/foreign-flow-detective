import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** TOP10 / 랭킹 카드에서 전체 순위 페이지로 이동 */
export function FullRankingsLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 sm:text-xs",
        className,
      )}
    >
      전체 순위
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}
