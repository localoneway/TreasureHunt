import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, priceSnapshots, savedSearches } from "@/db/schema";
import { isMarketplaceConfigured, searchMarketplace } from "@/lib/marketplaces";

export type PollResult = {
  savedSearchId: number;
  marketplace: string;
  newListings: number;
  updatedListings: number;
  error?: string;
};

export async function pollSavedSearch(searchId: number): Promise<PollResult> {
  const [search] = await db.select().from(savedSearches).where(eq(savedSearches.id, searchId));
  if (!search) {
    return { savedSearchId: searchId, marketplace: "unknown", newListings: 0, updatedListings: 0, error: "not found" };
  }

  if (!isMarketplaceConfigured(search.marketplace)) {
    return {
      savedSearchId: searchId,
      marketplace: search.marketplace,
      newListings: 0,
      updatedListings: 0,
      error: `${search.marketplace} is not configured (missing API credentials)`,
    };
  }

  const results = await searchMarketplace(search.marketplace, {
    keywords: search.keywords,
    minPriceCents: search.minPriceCents,
    maxPriceCents: search.maxPriceCents,
  });

  let newCount = 0;
  let updatedCount = 0;

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

  await db.update(savedSearches).set({ lastPolledAt: new Date() }).where(eq(savedSearches.id, searchId));

  return { savedSearchId: searchId, marketplace: search.marketplace, newListings: newCount, updatedListings: updatedCount };
}

export async function pollAllActiveSearches(): Promise<PollResult[]> {
  const active = await db.select().from(savedSearches).where(eq(savedSearches.active, true));
  const out: PollResult[] = [];
  for (const s of active) {
    out.push(await pollSavedSearch(s.id));
  }
  return out;
}
