import type { NormalizedListing, SearchParams } from "./types";
import { getEnv } from "@/lib/env";

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const SCOPE = "https://api.ebay.com/oauth/api_scope";

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isEbayConfigured(): boolean {
  return Boolean(getEnv("EBAY_CLIENT_ID") && getEnv("EBAY_CLIENT_SECRET"));
}

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = getEnv("EBAY_CLIENT_ID");
  const clientSecret = getEnv("EBAY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID / EBAY_CLIENT_SECRET are not configured");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SCOPE,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`eBay token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

type EbayItemSummary = {
  itemId: string;
  title: string;
  itemWebUrl: string;
  image?: { imageUrl?: string };
  price?: { value?: string; currency?: string };
  condition?: string;
};

export async function searchEbay(params: SearchParams): Promise<NormalizedListing[]> {
  if (!isEbayConfigured()) return [];

  const token = await getAppAccessToken();

  const filters: string[] = [];
  if (params.minPriceCents != null || params.maxPriceCents != null) {
    const min = params.minPriceCents != null ? (params.minPriceCents / 100).toFixed(2) : "";
    const max = params.maxPriceCents != null ? (params.maxPriceCents / 100).toFixed(2) : "";
    filters.push(`price:[${min}..${max}]`, "priceCurrency:USD");
  }

  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", params.keywords);
  url.searchParams.set("limit", String(params.limit ?? 50));
  url.searchParams.set("category_ids", "31387"); // Wristwatches
  if (filters.length) url.searchParams.set("filter", filters.join(","));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`eBay search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { itemSummaries?: EbayItemSummary[] };

  return (data.itemSummaries ?? []).map((item) => ({
    marketplace: "ebay" as const,
    externalId: item.itemId,
    title: item.title,
    url: item.itemWebUrl,
    imageUrl: item.image?.imageUrl ?? null,
    priceCents: item.price?.value ? Math.round(parseFloat(item.price.value) * 100) : null,
    currency: item.price?.currency ?? null,
    condition: item.condition ?? null,
  }));
}
