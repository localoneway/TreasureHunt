import type { NormalizedListing, SearchParams } from "./types";
import { getEnv } from "@/lib/env";

const SUBREDDIT = "Watchexchange";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const LISTING_URL = `https://oauth.reddit.com/r/${SUBREDDIT}/new`;
const USER_AGENT = "TreasureHuntApp/1.0 (vintage watch tracker)";

// Reddit's unauthenticated JSON endpoints block requests from cloud/datacenter IPs
// (including Vercel's), regardless of User-Agent — so a real OAuth app token is
// required even for read-only public data. Create a "script" app at
// https://www.reddit.com/prefs/apps to get REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.
export function isRedditConfigured(): boolean {
  return Boolean(getEnv("REDDIT_CLIENT_ID") && getEnv("REDDIT_CLIENT_SECRET"));
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = getEnv("REDDIT_CLIENT_ID");
  const clientSecret = getEnv("REDDIT_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET are not configured");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Reddit token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

type RedditPost = {
  id: string;
  title: string;
  permalink: string;
  thumbnail?: string;
  url?: string;
};

type RedditListingResponse = {
  data?: { children?: { data: RedditPost }[] };
};

function extractPriceCents(title: string): number | null {
  const match = title.match(/\$\s?([\d]{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

export async function searchReddit(params: SearchParams): Promise<NormalizedListing[]> {
  if (!isRedditConfigured()) return [];

  const token = await getAppAccessToken();

  const url = new URL(LISTING_URL);
  url.searchParams.set("limit", String(params.limit ?? 100));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Reddit listing fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as RedditListingResponse;
  const keywords = params.keywords
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return (data.data?.children ?? [])
    .map((child) => child.data)
    .filter((post) => {
      const title = post.title.toLowerCase();
      // Only sale/trade posts, not "want to buy" requests.
      if (title.includes("[wtb]")) return false;
      return keywords.every((k) => title.includes(k));
    })
    .map((post) => {
      const priceCents = extractPriceCents(post.title);
      return {
        marketplace: "reddit" as const,
        externalId: post.id,
        title: post.title,
        url: `https://www.reddit.com${post.permalink}`,
        imageUrl: post.thumbnail?.startsWith("http") ? post.thumbnail : null,
        priceCents,
        currency: "USD",
        condition: null,
      };
    })
    .filter((listing) => {
      if (listing.priceCents == null) return true;
      if (params.minPriceCents != null && listing.priceCents < params.minPriceCents) return false;
      if (params.maxPriceCents != null && listing.priceCents > params.maxPriceCents) return false;
      return true;
    });
}
