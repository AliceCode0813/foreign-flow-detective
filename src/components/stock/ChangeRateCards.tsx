import type { PeriodChange } from "@/lib/types";
import { formatChange, changeColor, changeBg, cn } from "@/lib/utils";

/** 1/5/20/60/전체 변화율 카드 */
export function ChangeRateCards({ changes }: { changes: PeriodChange[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {changes.map((item) => (
        <div
          key={item.period}
          className={cn(
            "rounded-xl border p-3 sm:p-4",
            changeBg(item.changePct),
          )}
        >
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {item.label} 변화
          </p>
          <p
            className={cn(
              "mt-1 text-xl font-bold tracking-tight sm:text-2xl",
              changeColor(item.changePct),
            )}
          >
            {formatChange(item.changePct)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-500">
            %p (지분율)
          </p>
        </div>
      ))}
    </div>
  );
}
