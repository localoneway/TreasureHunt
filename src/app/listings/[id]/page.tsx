import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, priceSnapshots } from "@/db/schema";
import { formatCents } from "@/lib/money";
import PriceHistoryChart from "@/components/price-history-chart";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const listingId = Number(id);
  if (Number.isNaN(listingId)) notFound();

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing) notFound();

  const snapshots = await db
    .select()
    .from(priceSnapshots)
    .where(eq(priceSnapshots.listingId, listingId))
    .orderBy(asc(priceSnapshots.capturedAt));

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
        <dt className="text-[#898781]">Current price</dt>
        <dd className="font-medium">{formatCents(listing.priceCents, listing.currency ?? "USD")}</dd>
        <dt className="text-[#898781]">Condition</dt>
        <dd>{listing.condition ?? "—"}</dd>
        <dt className="text-[#898781]">Last seen</dt>
        <dd>{new Date(listing.lastSeenAt).toLocaleString()}</dd>
      </dl>

      <div className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
        <h2 className="font-medium mb-3">Price history</h2>
        <PriceHistoryChart
          points={snapshots.map((s) => ({ capturedAt: s.capturedAt.toISOString(), priceCents: s.priceCents }))}
        />
      </div>
    </div>
  );
}
