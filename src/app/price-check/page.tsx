import { formatCents } from "@/lib/money";
import { checkPrice } from "@/lib/priceCheck";
import { PRICE_CHECK_SOURCES } from "@/lib/marketplaces";

export const dynamic = "force-dynamic";

export default async function PriceCheckPage({ searchParams }: PageProps<"/price-check">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const result = query ? await checkPrice(query) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Price check</h1>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-1">
          Describe a watch — brand, reference, and any dial/case variant — to see current
          asking prices from eBay and r/Watchexchange, plus quick links to cross-check against
          Chrono24, WatchCharts, Bob&apos;s Watches, and European Watch Co.
        </p>
        <p className="text-xs text-[#898781] mt-1">
          This is a snapshot of what&apos;s currently for sale, not a sold-price history — none of
          these sites expose that publicly.
        </p>
      </div>

      <form action="/price-check" method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          required
          placeholder="e.g. Rolex 16013 two tone Buckley dial"
          className="flex-1 rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-[#2a78d6] dark:bg-[#3987e5] text-white px-4 py-2 text-sm font-medium">
          Check price
        </button>
      </form>

      {query && (
        <div className="space-y-6">
          <div>
            <h2 className="font-medium">Cross-check elsewhere</h2>
            <p className="text-sm text-[#898781] mt-1">
              {PRICE_CHECK_SOURCES.map((source, i) => (
                <span key={source.id}>
                  {i > 0 && " · "}
                  <a
                    href={source.searchUrl(query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2a78d6] dark:text-[#3987e5] underline"
                  >
                    {source.label}
                  </a>
                </span>
              ))}
            </p>
          </div>

          {result?.stats ? (
            <div className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
              <h2 className="font-medium">
                Live asking prices for &ldquo;{query}&rdquo; ({result.stats.count}{" "}
                {result.stats.count === 1 ? "listing" : "listings"})
              </h2>
              <div className="grid gap-4 sm:grid-cols-3 mt-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#898781]">Low</p>
                  <p className="text-lg font-semibold">{formatCents(result.stats.minCents)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#898781]">Median</p>
                  <p className="text-lg font-semibold">{formatCents(result.stats.medianCents)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#898781]">High</p>
                  <p className="text-lg font-semibold">{formatCents(result.stats.maxCents)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#898781]">
              No priced listings found on eBay or r/Watchexchange for that search right now.
            </p>
          )}

          {result?.byMarketplace.map((m) => (
            <div key={m.marketplace} className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{m.label}</h3>
                {!m.configured && (
                  <span className="text-xs text-[#898781]">not configured</span>
                )}
              </div>
              {m.error && <p className="text-xs text-[#d03b3b] mt-1">⚠ {m.error}</p>}
              {m.configured && !m.error && m.listings.length === 0 && (
                <p className="text-sm text-[#898781] mt-1">No matches.</p>
              )}
              {m.listings.length > 0 && (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {m.listings.slice(0, 12).map((listing) => (
                    <li key={listing.externalId} className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded overflow-hidden">
                      <a href={listing.url} target="_blank" rel="noopener noreferrer" className="block">
                        {listing.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.imageUrl}
                            alt=""
                            className="w-full aspect-square object-cover bg-[#f2f2f2] dark:bg-[#1e1e1e]"
                          />
                        )}
                        <div className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{listing.title}</p>
                          <p className="text-sm text-[#2a78d6] dark:text-[#3987e5] mt-1">
                            {formatCents(listing.priceCents, listing.currency ?? "USD")}
                          </p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
