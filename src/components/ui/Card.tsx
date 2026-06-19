import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        "dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}: {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2
        className={cn(
          "text-base font-semibold text-slate-900 dark:text-slate-100",
          titleClassName,
        )}
      >
        {children}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-0.5 text-sm text-slate-500 dark:text-slate-400",
            subtitleClassName,
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
