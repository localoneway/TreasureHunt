import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, priceSnapshots, savedSearches } from "@/db/schema";
import { isMarketplaceConfigured, searchMarketplace, type NormalizedListing } from "@/lib/marketplaces";
import { sendNewListingsAlert, type AlertItem } from "@/lib/email";

export type PollResult = {
  savedSearchId: number;
  marketplace: string;
  newListings: number;
  updatedListings: number;
  newItems: NormalizedListing[];
  error?: string;
};

function emptyResult(searchId: number, marketplace: string, error?: string): PollResult {
  return { savedSearchId: searchId, marketplace, newListings: 0, updatedListings: 0, newItems: [], error };
}

export async function pollSavedSearch(searchId: number): Promise<PollResult> {
  const [search] = await db.select().from(savedSearches).where(eq(savedSearches.id, searchId));
  if (!search) return emptyResult(searchId, "unknown", "not found");

  if (!isMarketplaceConfigured(search.marketplace)) {
    const message = `${search.marketplace} is not configured (missing API credentials)`;
    await db.update(savedSearches).set({ lastPolledAt: new Date(), lastError: message }).where(eq(savedSearches.id, searchId));
    return emptyResult(searchId, search.marketplace, message);
  }

  let results: NormalizedListing[];
  try {
    results = await searchMarketplace(search.marketplace, {
      keywords: search.keywords,
      minPriceCents: search.minPriceCents,
      maxPriceCents: search.maxPriceCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(savedSearches).set({ lastPolledAt: new Date(), lastError: message }).where(eq(savedSearches.id, searchId));
    return emptyResult(searchId, search.marketplace, message);
  }

  let newCount = 0;
  let updatedCount = 0;
  const newItems: NormalizedListing[] = [];

  for (const item of results) {
    const [existing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.marketplace, item.marketplace), eq(listings.externalId, item.externalId)));

    if (existing) {
      updatedCount += 1;
      await db
        .update(listings)
        .set({
          title: item.title,
          priceCents: item.priceCents,
          currency: item.currency,
          imageUrl: item.imageUrl,
          condition: item.condition,
          lastSeenAt: new Date(),
          isNew: false,
        })
        .where(eq(listings.id, existing.id));

      if (item.priceCents != null && item.priceCents !== existing.priceCents) {
        await db.insert(priceSnapshots).values({ listingId: existing.id, priceCents: item.priceCents });
      }
    } else {
      newCount += 1;
      newItems.push(item);
      const [inserted] = await db
        .insert(listings)
        .values({
          savedSearchId: search.id,
          marketplace: item.marketplace,
          externalId: item.externalId,
          title: item.title,
          url: item.url,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          currency: item.currency,
          condition: item.condition,
          isNew: true,
        })
        .returning();

      if (item.priceCents != null && inserted) {
        await db.insert(priceSnapshots).values({ listingId: inserted.id, priceCents: item.priceCents });
      }
    }
  }

  await db.update(savedSearches).set({ lastPolledAt: new Date(), lastError: null }).where(eq(savedSearches.id, searchId));

  return { savedSearchId: searchId, marketplace: search.marketplace, newListings: newCount, updatedListings: updatedCount, newItems };
}

export async function pollAllActiveSearches(): Promise<PollResult[]> {
  const active = await db.select().from(savedSearches).where(eq(savedSearches.active, true));
  const out: PollResult[] = [];
  for (const s of active) {
    out.push(await pollSavedSearch(s.id));
  }

  const alertItems: AlertItem[] = [];
  for (const result of out) {
    const search = active.find((s) => s.id === result.savedSearchId);
    if (!search) continue;
    for (const listing of result.newItems) {
      alertItems.push({ searchName: search.name, listing });
    }
  }

  if (alertItems.length > 0) {
    try {
      await sendNewListingsAlert(alertItems);
    } catch (err) {
      // Don't let an email failure mask successful polling results.
      console.error("Failed to send new-listings alert email", err);
    }
  }

  return out;
}
