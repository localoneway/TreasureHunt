import { isEbayConfigured, searchEbay } from "./ebay";
import { isRedditConfigured, searchReddit } from "./reddit";
import type { NormalizedListing, SearchParams } from "./types";

export type { NormalizedListing, SearchParams };
export { MANUAL_MARKETPLACES } from "./manual";
export type { ManualMarketplace, ManualMarketplaceId } from "./manual";
export { PRICE_CHECK_SOURCES } from "./priceCheck";
export type { PriceCheckSource, PriceCheckSourceId } from "./priceCheck";

export const MARKETPLACES = [
  { id: "ebay", label: "eBay" },
  { id: "reddit", label: "r/Watchexchange" },
] as const;

export function isMarketplaceConfigured(marketplace: string): boolean {
  if (marketplace === "ebay") return isEbayConfigured();
  if (marketplace === "reddit") return isRedditConfigured();
  return false;
}

export async function searchMarketplace(
  marketplace: string,
  params: SearchParams,
): Promise<NormalizedListing[]> {
  if (marketplace === "ebay") return searchEbay(params);
  if (marketplace === "reddit") return searchReddit(params);
  throw new Error(`Unsupported marketplace: ${marketplace}`);
}
