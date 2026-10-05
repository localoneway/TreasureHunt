export type PriceCheckSourceId = "chrono24" | "watchcharts" | "bobswatches" | "europeanwatch";

export type PriceCheckSource = {
  id: PriceCheckSourceId;
  label: string;
  searchUrl: (query: string) => string;
};

// None of these sites have a public pricing API — same situation as
// Depop/Poshmark/Gem in manual.ts, so these are link-outs to each site's own
// search page for a given query, not something this app queries directly.
// URL formats: Chrono24's is directly confirmed; the others follow each
// site's typical search URL convention and may need adjusting if the site
// changes it. Crown & Caliber stopped selling its own inventory in 2024 (sold
// to European Watch Company), so that's listed instead.
export const PRICE_CHECK_SOURCES: PriceCheckSource[] = [
  {
    id: "chrono24",
    label: "Chrono24",
    searchUrl: (query) =>
      `https://www.chrono24.com/search/index.htm?dosearch=true&query=${encodeURIComponent(query)}`,
  },
  {
    id: "watchcharts",
    label: "WatchCharts",
    searchUrl: (query) => `https://watchcharts.com/search?query=${encodeURIComponent(query)}`,
  },
  {
    id: "bobswatches",
    label: "Bob's Watches",
    searchUrl: (query) => `https://www.bobswatches.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: "europeanwatch",
    label: "European Watch Co.",
    searchUrl: (query) => `https://europeanwatch.com/search?q=${encodeURIComponent(query)}`,
  },
];
