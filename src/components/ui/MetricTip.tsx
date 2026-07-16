import { cn } from "@/lib/utils";

/** 열 제목용 간단한 툴팁 (?) */
export function MetricTip({
  label,
  tip,
  className,
}: {
  label: string;
  tip: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span>{label}</span>
      <span
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold leading-none text-slate-600 dark:bg-slate-700 dark:text-slate-300"
        title={tip}
        aria-label={tip}
      >
        ?
      </span>
    </span>
  );
}
