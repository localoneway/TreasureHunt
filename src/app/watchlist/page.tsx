import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, savedSearches } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { isMarketplaceConfigured, MARKETPLACES } from "@/lib/marketplaces";
import {
  createSavedSearch,
  deleteSavedSearch,
  runSavedSearchNow,
  toggleSavedSearchActive,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const searches = await db.select().from(savedSearches).orderBy(desc(savedSearches.createdAt));

  const searchesWithListings = await Promise.all(
    searches.map(async (search) => {
      const items = await db
        .select()
        .from(listings)
        .where(eq(listings.savedSearchId, search.id))
        .orderBy(desc(listings.firstSeenAt))
        .limit(12);
      return { search, items };
    }),
  );

  const marketplaceStatus = MARKETPLACES.map((m) => ({ ...m, ready: isMarketplaceConfigured(m.id) }));
  const notReady = marketplaceStatus.filter((m) => !m.ready);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Watchlist</h1>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-1">
          Save a search and TreasureHunt will poll eBay or r/Watchexchange for matching vintage watches.
        </p>
        {notReady.length > 0 && (
          <p className="mt-3 rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-[#fcfcfb] dark:bg-[#1a1a19] px-3 py-2 text-sm text-[#898781]">
            {notReady.map((m) => m.label).join(", ")} {notReady.length === 1 ? "is" : "are"} not configured
            yet. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in your environment to enable eBay search —
            saved searches can still be created now.
          </p>
        )}
      </div>

      <form action={createSavedSearch} className="grid gap-3 sm:grid-cols-2 border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1" htmlFor="name">
            Search name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Seiko 6139 chronograph"
            className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1" htmlFor="keywords">
            Keywords
          </label>
          <input
            id="keywords"
            name="keywords"
            required
            placeholder="e.g. seiko 6139 vintage chronograph"
            className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1" htmlFor="marketplace">
            Marketplace
          </label>
          <select
            id="marketplace"
            name="marketplace"
            className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
          >
            {MARKETPLACES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="minPrice">
            Min price (USD)
          </label>
          <input
            id="minPrice"
            name="minPrice"
            type="number"
            step="0.01"
            className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="maxPrice">
            Max price (USD)
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            step="0.01"
            className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded bg-[#2a78d6] dark:bg-[#3987e5] text-white px-4 py-2 text-sm font-medium">
            Add saved search
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {searchesWithListings.length === 0 && (
          <p className="text-sm text-[#898781]">No saved searches yet — add one above.</p>
        )}
        {searchesWithListings.map(({ search, items }) => (
          <div key={search.id} className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-medium">{search.name}</h2>
                <p className="text-sm text-[#898781]">
                  {MARKETPLACES.find((m) => m.id === search.marketplace)?.label ?? search.marketplace} ·
                  “{search.keywords}”
                  {search.minPriceCents != null && ` · min ${formatCents(search.minPriceCents)}`}
                  {search.maxPriceCents != null && ` · max ${formatCents(search.maxPriceCents)}`}
                </p>
                <p className="text-xs text-[#898781] mt-1">
                  {search.lastPolledAt
                    ? `Last polled ${new Date(search.lastPolledAt).toLocaleString()}`
                    : "Never polled"}{" "}
                  · {search.active ? "active" : "paused"}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <form action={runSavedSearchNow.bind(null, search.id)}>
                  <button type="submit" className="rounded border border-[#e1e0d9] dark:border-[#2c2c2a] px-3 py-1.5 text-sm">
                    Run now
                  </button>
                </form>
                <form action={toggleSavedSearchActive.bind(null, search.id, !search.active)}>
                  <button type="submit" className="rounded border border-[#e1e0d9] dark:border-[#2c2c2a] px-3 py-1.5 text-sm">
                    {search.active ? "Pause" : "Resume"}
                  </button>
                </form>
                <form action={deleteSavedSearch.bind(null, search.id)}>
                  <button type="submit" className="rounded border border-[#e1e0d9] dark:border-[#2c2c2a] px-3 py-1.5 text-sm text-[#d03b3b]">
                    Delete
                  </button>
                </form>
              </div>
            </div>

            {items.length > 0 && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((listing) => (
                  <li key={listing.id} className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded p-3">
                    <Link href={`/listings/${listing.id}`} className="block">
                      <p className="text-sm font-medium line-clamp-2">{listing.title}</p>
                      <p className="text-sm text-[#2a78d6] dark:text-[#3987e5] mt-1">
                        {formatCents(listing.priceCents, listing.currency ?? "USD")}
                      </p>
                      {listing.isNew && (
                        <span className="inline-block mt-1 text-xs rounded bg-[#0ca30c]/10 text-[#0ca30c] px-1.5 py-0.5">
                          new
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
