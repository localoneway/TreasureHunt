import { isMarketplaceConfigured, MARKETPLACES, searchMarketplace, type NormalizedListing } from "@/lib/marketplaces";

export type PriceStats = {
  count: number;
  minCents: number;
  medianCents: number;
  maxCents: number;
};

export type MarketplacePriceCheck = {
  marketplace: string;
  label: string;
  configured: boolean;
  listings: NormalizedListing[];
  error?: string;
};

export type PriceCheckResult = {
  query: string;
  byMarketplace: MarketplacePriceCheck[];
  stats: PriceStats | null;
};

function median(sortedCents: number[]): number {
  const mid = Math.floor(sortedCents.length / 2);
  return sortedCents.length % 2 !== 0
    ? sortedCents[mid]
    : Math.round((sortedCents[mid - 1] + sortedCents[mid]) / 2);
}

function summarize(listings: NormalizedListing[]): PriceStats | null {
  const priced = listings
    .map((l) => l.priceCents)
    .filter((cents): cents is number => cents != null)
    .sort((a, b) => a - b);
  if (priced.length === 0) return null;
  return { count: priced.length, minCents: priced[0], medianCents: median(priced), maxCents: priced[priced.length - 1] };
}

// Checks the given reference/description against every marketplace that has a
// real, live search API (currently eBay and r/Watchexchange) and summarizes
// the asking prices found — this is a snapshot of what's currently listed for
// sale, not a sold-price history (no marketplace here exposes that). Chrono24,
// WatchCharts, Bob's Watches, and European Watch Co. have no API to query, so
// they're surfaced separately as manual cross-check links (see
// src/lib/marketplaces/priceCheck.ts) rather than included here.
export async function checkPrice(query: string): Promise<PriceCheckResult> {
  const byMarketplace: MarketplacePriceCheck[] = await Promise.all(
    MARKETPLACES.map(async (m) => {
      const configured = isMarketplaceConfigured(m.id);
      if (!configured) {
        return { marketplace: m.id, label: m.label, configured, listings: [] };
      }
      try {
        const listings = await searchMarketplace(m.id, { keywords: query, limit: 50 });
        return { marketplace: m.id, label: m.label, configured, listings };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { marketplace: m.id, label: m.label, configured, listings: [], error };
      }
    }),
  );

  const allListings = byMarketplace.flatMap((m) => m.listings);
  return { query, byMarketplace, stats: summarize(allListings) };
}
