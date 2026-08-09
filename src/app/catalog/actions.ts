"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogItems, priceSnapshots } from "@/db/schema";
import { dollarsToCents } from "@/lib/money";
import { redirect } from "next/navigation";

export async function createCatalogItem(formData: FormData) {
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  if (!brand || !model) return;

  const purchasePriceCents = dollarsToCents(String(formData.get("purchasePrice") ?? ""));

  const [item] = await db
    .insert(catalogItems)
    .values({
      brand,
      model,
      referenceNumber: String(formData.get("referenceNumber") ?? "").trim() || null,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      status: String(formData.get("status") ?? "watching"),
      sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null,
      imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
      condition: String(formData.get("condition") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      purchasePriceCents,
      currentEstimateCents: purchasePriceCents,
    })
    .returning();

  if (item && purchasePriceCents != null) {
    await db.insert(priceSnapshots).values({ catalogItemId: item.id, priceCents: purchasePriceCents });
  }

  revalidatePath("/catalog");
}

export async function deleteCatalogItem(id: number) {
  await db.delete(catalogItems).where(eq(catalogItems.id, id));
  revalidatePath("/catalog");
  redirect("/catalog");
}

export async function addValueSnapshot(id: number, formData: FormData) {
  const cents = dollarsToCents(String(formData.get("estimateValue") ?? ""));
  if (cents == null) return;

  await db.update(catalogItems).set({ currentEstimateCents: cents, updatedAt: new Date() }).where(eq(catalogItems.id, id));
  await db.insert(priceSnapshots).values({ catalogItemId: id, priceCents: cents });

  revalidatePath(`/catalog/${id}`);
}
