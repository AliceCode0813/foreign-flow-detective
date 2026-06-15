import { Database } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

/** DB 데이터 없을 때 안내 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-900">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Database className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      </span>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <pre className="mt-4 rounded-lg bg-slate-50 px-4 py-2 text-left text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        npm run db:push{"\n"}npm run ingest
      </pre>
    </div>
  );
}
