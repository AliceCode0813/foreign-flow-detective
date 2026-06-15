import type {
  ConsecutiveInflowEntry,
  CorrelationPoint,
  MarketFilter,
  MoverSortKey,
  OwnershipMoverRow,
  SectorHeatmapCell,
} from "@/lib/types";

export function sortMovers(
  movers: OwnershipMoverRow[],
  sort: MoverSortKey,
): OwnershipMoverRow[] {
  const sorted = [...movers];
  switch (sort) {
    case "marketcap":
      return sorted.sort((a, b) => b.marketCap - a.marketCap);
    case "price":
      return sorted.sort((a, b) => b.priceChange1d - a.priceChange1d);
    case "change60d":
      return sorted.sort((a, b) => b.change60d - a.change60d);
    case "volatility":
    default:
      return sorted.sort((a, b) => b.absChange60d - a.absChange60d);
  }
}

export function buildCorrelationPoints(movers: OwnershipMoverRow[]): CorrelationPoint[] {
  return movers
    .filter((m) => m.absChange60d > 0 || Math.abs(m.priceChange60d) > 0.1)
    .map((m) => ({
      code: m.code,
      name: m.name,
      change60d: m.change60d,
      priceChange60d: m.priceChange60d,
      marketCap: m.marketCap,
    }));
}

export function buildSectorHeatmap(
  movers: OwnershipMoverRow[],
  market: MarketFilter,
): SectorHeatmapCell[] {
  const groups = new Map<string, { sum: number; count: number }>();

  for (const m of movers) {
    const label =
      m.sector?.trim() ||
      (market === "ALL" ? m.market : m.market);
    const g = groups.get(label) ?? { sum: 0, count: 0 };
    g.sum += m.change60d;
    g.count += 1;
    groups.set(label, g);
  }

  return [...groups.entries()]
    .map(([label, g]) => ({
      label,
      count: g.count,
      avgChange60d: Math.round((g.sum / g.count) * 100) / 100,
    }))
    .sort((a, b) => b.avgChange60d - a.avgChange60d);
}

export function buildConsecutiveInflowTop(
  movers: OwnershipMoverRow[],
  limit = 10,
  minStreak = 3,
): ConsecutiveInflowEntry[] {
  return movers
    .filter((m) => m.consecutiveUpDays >= minStreak)
    .sort((a, b) => b.consecutiveUpDays - a.consecutiveUpDays || b.change60d - a.change60d)
    .slice(0, limit)
    .map((m) => ({ ...m, streakDays: m.consecutiveUpDays }));
}
