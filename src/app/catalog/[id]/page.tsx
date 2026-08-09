import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogItems, priceSnapshots } from "@/db/schema";
import { formatCents } from "@/lib/money";
import PriceHistoryChart from "@/components/price-history-chart";
import { addValueSnapshot, deleteCatalogItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function CatalogItemPage({ params }: PageProps<"/catalog/[id]">) {
  const { id } = await params;
  const itemId = Number(id);
  if (Number.isNaN(itemId)) notFound();

  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!item) notFound();

  const snapshots = await db
    .select()
    .from(priceSnapshots)
    .where(eq(priceSnapshots.catalogItemId, itemId))
    .orderBy(asc(priceSnapshots.capturedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">
            {item.brand} {item.model}
          </h1>
          {item.nickname && <p className="text-sm text-[#898781]">“{item.nickname}”</p>}
          {item.referenceNumber && <p className="text-sm text-[#898781]">Ref. {item.referenceNumber}</p>}
        </div>
        <form action={deleteCatalogItem.bind(null, item.id)}>
          <button type="submit" className="rounded border border-[#e1e0d9] dark:border-[#2c2c2a] px-3 py-1.5 text-sm text-[#d03b3b]">
            Delete
          </button>
        </form>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-3 text-sm border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4 h-fit">
          <dt className="text-[#898781]">Status</dt>
          <dd className="capitalize">{item.status}</dd>
          <dt className="text-[#898781]">Condition</dt>
          <dd>{item.condition ?? "—"}</dd>
          <dt className="text-[#898781]">Purchase price</dt>
          <dd>{formatCents(item.purchasePriceCents)}</dd>
          <dt className="text-[#898781]">Current estimate</dt>
          <dd className="font-medium">{formatCents(item.currentEstimateCents)}</dd>
          {item.sourceUrl && (
            <>
              <dt className="text-[#898781]">Source</dt>
              <dd>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[#2a78d6] dark:text-[#3987e5] underline">
                  listing link
                </a>
              </dd>
            </>
          )}
          {item.notes && (
            <>
              <dt className="text-[#898781] col-span-2">Notes</dt>
              <dd className="col-span-2">{item.notes}</dd>
            </>
          )}
        </dl>

        <form
          action={addValueSnapshot.bind(null, item.id)}
          className="flex flex-col gap-2 border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4 h-fit"
        >
          <label className="text-sm" htmlFor="estimateValue">
            Log a new value estimate
          </label>
          <input
            id="estimateValue"
            name="estimateValue"
            type="number"
            step="0.01"
            required
            className="rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-[#2a78d6] dark:bg-[#3987e5] text-white px-3 py-2 text-sm font-medium">
            Save
          </button>
        </form>
      </div>

      <div className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
        <h2 className="font-medium mb-3">Value history</h2>
        <PriceHistoryChart
          points={snapshots.map((s) => ({ capturedAt: s.capturedAt.toISOString(), priceCents: s.priceCents }))}
        />
      </div>
    </div>
  );
}
