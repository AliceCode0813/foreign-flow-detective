import { CardSkeleton } from "@/components/ui/Skeleton";

export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <CardSkeleton rows={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={5} />
      </div>
      <CardSkeleton rows={8} />
    </div>
  );
}
