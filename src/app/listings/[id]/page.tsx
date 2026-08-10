import { notFound } from "next/navigation";
import { and, asc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { formatCents } from "@/lib/money";
import PriceHistoryChart from "@/components/price-history-chart";

export const dynamic = "force-dynamic";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const listingId = Number(id);
  if (Number.isNaN(listingId)) notFound();

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing) notFound();

  // Vintage watches are one-off pieces — a single listing's price rarely
  // changes, so "price history" for one listing isn't meaningful. Instead show
  // comps: every other listing matched by the same saved search, as a scatter
  // of price vs. when it was first seen.
  const comps = listing.savedSearchId
    ? await db
        .select()
        .from(listings)
        .where(
          and(
            eq(listings.savedSearchId, listing.savedSearchId),
            isNotNull(listings.priceCents),
            ne(listings.id, listing.id),
          ),
        )
        .orderBy(asc(listings.firstSeenAt))
    : [];

  const compPrices = comps.map((c) => c.priceCents!).filter((p) => p != null);
  const medianComp = median(compPrices);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{listing.title}</h1>
          <p className="text-sm text-[#898781] mt-1 capitalize">
            {listing.marketplace} · first seen {new Date(listing.firstSeenAt).toLocaleDateString()}
          </p>
        </div>
        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-[#2a78d6] dark:bg-[#3987e5] text-white px-4 py-2 text-sm font-medium"
        >
          View on {listing.marketplace}
        </a>
      </div>

      {listing.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.imageUrl} alt={listing.title} className="max-h-80 rounded border border-[#e1e0d9] dark:border-[#2c2c2a]" />
      )}

      <dl className="grid grid-cols-2 gap-3 text-sm border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4 max-w-md">
        <dt className="text-[#898781]">This listing&apos;s price</dt>
        <dd className="font-medium">{formatCents(listing.priceCents, listing.currency ?? "USD")}</dd>
        <dt className="text-[#898781]">Condition</dt>
        <dd>{listing.condition ?? "—"}</dd>
        <dt className="text-[#898781]">Last seen</dt>
        <dd>{new Date(listing.lastSeenAt).toLocaleString()}</dd>
        {medianComp != null && (
          <>
            <dt className="text-[#898781]">Median comp</dt>
            <dd>{formatCents(medianComp)}</dd>
          </>
        )}
      </dl>

      <div className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
        <h2 className="font-medium mb-1">Comps</h2>
        <p className="text-xs text-[#898781] mb-3">
          Other listings from the same saved search — since these are individual vintage pieces rather
          than restocked items, each point is a different watch, not this one repricing.
        </p>
        <PriceHistoryChart
          variant="scatter"
          points={comps
            .filter((c) => c.priceCents != null)
            .map((c) => ({ capturedAt: c.firstSeenAt.toISOString(), priceCents: c.priceCents!, label: c.title }))}
          emptyMessage="No comparable listings seen yet for this search."
        />
      </div>
    </div>
  );
}
