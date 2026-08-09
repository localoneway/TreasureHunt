"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savedSearches } from "@/db/schema";
import { dollarsToCents } from "@/lib/money";
import { MARKETPLACES } from "@/lib/marketplaces";
import { pollSavedSearch } from "@/lib/poll";

export async function createSavedSearch(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "").trim();
  const minPrice = String(formData.get("minPrice") ?? "");
  const maxPrice = String(formData.get("maxPrice") ?? "");
  const marketplaceInput = String(formData.get("marketplace") ?? "ebay");
  const marketplace = MARKETPLACES.some((m) => m.id === marketplaceInput) ? marketplaceInput : "ebay";

  if (!name || !keywords) return;

  await db.insert(savedSearches).values({
    name,
    keywords,
    marketplace,
    minPriceCents: dollarsToCents(minPrice),
    maxPriceCents: dollarsToCents(maxPrice),
  });

  revalidatePath("/watchlist");
}

export async function deleteSavedSearch(id: number) {
  await db.delete(savedSearches).where(eq(savedSearches.id, id));
  revalidatePath("/watchlist");
}

export async function toggleSavedSearchActive(id: number, active: boolean) {
  await db.update(savedSearches).set({ active }).where(eq(savedSearches.id, id));
  revalidatePath("/watchlist");
}

export async function runSavedSearchNow(id: number) {
  await pollSavedSearch(id);
  revalidatePath("/watchlist");
}
