export type MarketplaceId = "ebay";

export type NormalizedListing = {
  marketplace: MarketplaceId;
  externalId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  priceCents: number | null;
  currency: string | null;
  condition: string | null;
};

export type SearchParams = {
  keywords: string;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  limit?: number;
};
