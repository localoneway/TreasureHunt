import type { NormalizedListing, SearchParams } from "./types";

const SUBREDDIT = "Watchexchange";
const LISTING_URL = `https://www.reddit.com/r/${SUBREDDIT}/new.json`;

// r/Watchexchange has no API keys to configure — it's a public JSON feed.
export function isRedditConfigured(): boolean {
  return true;
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
  const url = new URL(LISTING_URL);
  url.searchParams.set("limit", String(params.limit ?? 100));

  const res = await fetch(url, {
    headers: { "User-Agent": "TreasureHuntApp/1.0 (vintage watch tracker)" },
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
