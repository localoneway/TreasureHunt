import { isEbayConfigured, searchEbay } from "./ebay";
import type { NormalizedListing, SearchParams } from "./types";

export type { NormalizedListing, SearchParams };

export function isMarketplaceConfigured(marketplace: string): boolean {
  if (marketplace === "ebay") return isEbayConfigured();
  return false;
}

export async function searchMarketplace(
  marketplace: string,
  params: SearchParams,
): Promise<NormalizedListing[]> {
  if (marketplace === "ebay") return searchEbay(params);
  throw new Error(`Unsupported marketplace: ${marketplace}`);
}
