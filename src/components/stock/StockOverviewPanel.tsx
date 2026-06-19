import { Card, CardTitle } from "@/components/ui/Card";

/** DART 회사개요 */
export function StockOverviewPanel({
  overview,
  stockName,
}: {
  overview: string | null;
  stockName: string;
}) {
  if (!overview) {
    return (
      <Card className="mb-6">
        <CardTitle subtitle="DART Open API · py scripts/fetch_dart_overview.py">
          회사개요
        </CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {stockName} 회사개요 데이터가 아직 없습니다. DART_API_KEY 설정 후 fetch_dart_overview를
          실행하세요.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardTitle subtitle="DART Open API">회사개요</CardTitle>
      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {overview}
      </div>
    </Card>
  );
}
