import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { catalogItems, listings, savedSearches } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { isMarketplaceConfigured, MARKETPLACES } from "@/lib/marketplaces";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ count: searchCount } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(savedSearches)
    .where(eq(savedSearches.active, true));

  const [{ count: catalogCount } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(catalogItems);

  const recentListings = await db.select().from(listings).orderBy(desc(listings.firstSeenAt)).limit(6);

  const connectedMarketplaces = MARKETPLACES.filter((m) => isMarketplaceConfigured(m.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-1">
          Track vintage watches posted online — saved searches, a manual catalog, and price history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/watchlist" className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-[#898781]">Active searches</p>
          <p className="text-2xl font-semibold mt-1">{searchCount}</p>
        </Link>
        <Link href="/catalog" className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-[#898781]">Catalog items</p>
          <p className="text-2xl font-semibold mt-1">{catalogCount}</p>
        </Link>
        <div className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-[#898781]">Marketplaces connected</p>
          <p className="text-2xl font-semibold mt-1">
            {connectedMarketplaces.length} / {MARKETPLACES.length}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recently seen listings</h2>
          <Link href="/watchlist" className="text-sm text-[#2a78d6] dark:text-[#3987e5]">
            Manage searches
          </Link>
        </div>
        {recentListings.length === 0 ? (
          <p className="text-sm text-[#898781] mt-3">
            Nothing yet — add a saved search on the Watchlist page to start tracking listings.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => (
              <li key={listing.id} className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded overflow-hidden">
                <Link href={`/listings/${listing.id}`}>
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
