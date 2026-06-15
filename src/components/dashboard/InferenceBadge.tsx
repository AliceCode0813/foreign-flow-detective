import type { OwnershipInference } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, string> = {
  주가급등동반: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  주가상승동반: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  하락장저가매수: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  주가하락중유입: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  주가보합유입: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  외국인순매수: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
  거래량급증: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  거래활발: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
};

export function InferenceBadge({
  inference,
  compact = false,
}: {
  inference: OwnershipInference;
  compact?: boolean;
}) {
  if (inference.tags.length === 0) {
    return (
      <span className="text-[11px] text-slate-400" title={inference.summary}>
        패턴 없음
      </span>
    );
  }

  if (compact) {
    return (
      <span
        className="text-[11px] text-slate-600 dark:text-slate-400"
        title={inference.summary}
      >
        {inference.tags[0]}
        {inference.tags.length > 1 ? ` +${inference.tags.length - 1}` : ""}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1" title={inference.summary}>
      {inference.tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
