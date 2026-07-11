import { StockDetailSkeleton } from "@/components/ui/Skeleton";

export default function StockDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <StockDetailSkeleton />
    </div>
  );
}
