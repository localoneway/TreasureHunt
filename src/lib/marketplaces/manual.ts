// Depop, Poshmark, and Gem have no public API to poll: Depop's internal search
// endpoint sits behind Cloudflare bot protection, Poshmark only exposes an
// undocumented internal endpoint (against its ToS to rely on), and Gem (gem.app)
// is itself a search aggregator over other resale sites with no API of its own.
// So these aren't wired into the saved-search/poll/alert pipeline like eBay and
// Reddit — they're just link-outs to that site's own search page for a given set
// of keywords, for manually checking alongside a saved search.
export type ManualMarketplaceId = "depop" | "poshmark" | "gem";

export type ManualMarketplace = {
  id: ManualMarketplaceId;
  label: string;
  searchUrl: (keywords: string) => string;
};

export const MANUAL_MARKETPLACES: ManualMarketplace[] = [
  {
    id: "depop",
    label: "Depop",
    searchUrl: (keywords) => `https://www.depop.com/search/?q=${encodeURIComponent(keywords)}`,
  },
  {
    id: "poshmark",
    label: "Poshmark",
    searchUrl: (keywords) => `https://poshmark.com/search?query=${encodeURIComponent(keywords)}`,
  },
  {
    id: "gem",
    label: "Gem",
    searchUrl: (keywords) => `https://gem.app/search?q=${encodeURIComponent(keywords)}`,
  },
];
