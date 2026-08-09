import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { catalogItems } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { createCatalogItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const items = await db.select().from(catalogItems).orderBy(desc(catalogItems.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Catalog</h1>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-1">
          Watches you own or are tracking by hand, with estimated value over time.
        </p>
      </div>

      <form action={createCatalogItem} className="grid gap-3 sm:grid-cols-2 border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="brand">Brand</label>
          <input id="brand" name="brand" required placeholder="Omega" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="model">Model</label>
          <input id="model" name="model" required placeholder="Speedmaster Professional" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="referenceNumber">Reference number</label>
          <input id="referenceNumber" name="referenceNumber" placeholder="145.022" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="nickname">Nickname</label>
          <input id="nickname" name="nickname" placeholder="Moonwatch" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="status">Status</label>
          <select id="status" name="status" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm">
            <option value="watching">Watching</option>
            <option value="owned">Owned</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="condition">Condition</label>
          <input id="condition" name="condition" placeholder="Very good, box + papers" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="purchasePrice">Purchase / asking price (USD)</label>
          <input id="purchasePrice" name="purchasePrice" type="number" step="0.01" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="sourceUrl">Source URL</label>
          <input id="sourceUrl" name="sourceUrl" placeholder="https://…" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1" htmlFor="imageUrl">Image URL</label>
          <input id="imageUrl" name="imageUrl" placeholder="https://…" className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={2} className="w-full rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-transparent px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded bg-[#2a78d6] dark:bg-[#3987e5] text-white px-4 py-2 text-sm font-medium">
            Add to catalog
          </button>
        </div>
      </form>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <p className="text-sm text-[#898781]">No watches in your catalog yet.</p>}
        {items.map((item) => (
          <li key={item.id} className="border border-[#e1e0d9] dark:border-[#2c2c2a] rounded-lg p-4">
            <Link href={`/catalog/${item.id}`}>
              <p className="font-medium">
                {item.brand} {item.model}
              </p>
              {item.nickname && <p className="text-sm text-[#898781]">“{item.nickname}”</p>}
              <p className="text-xs uppercase tracking-wide text-[#898781] mt-1">{item.status}</p>
              <p className="text-sm mt-2">{formatCents(item.currentEstimateCents)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
