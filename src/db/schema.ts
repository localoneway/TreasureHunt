import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Watches the user personally owns or is manually tracking (not tied to a live listing).
export const catalogItems = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  referenceNumber: text("reference_number"),
  nickname: text("nickname"),
  status: text("status").notNull().default("watching"), // watching | owned | sold
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  purchasePriceCents: integer("purchase_price_cents"),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  currentEstimateCents: integer("current_estimate_cents"),
  condition: text("condition"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A standing search the poller runs periodically against marketplace APIs.
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  marketplace: text("marketplace").notNull().default("ebay"),
  minPriceCents: integer("min_price_cents"),
  maxPriceCents: integer("max_price_cents"),
  active: boolean("active").notNull().default(true),
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A single listing seen on a marketplace, matched to a saved search.
export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    savedSearchId: integer("saved_search_id").references(() => savedSearches.id, {
      onDelete: "cascade",
    }),
    marketplace: text("marketplace").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    priceCents: integer("price_cents"),
    currency: text("currency").default("USD"),
    condition: text("condition"),
    isNew: boolean("is_new").notNull().default(true),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("listings_marketplace_external_id_idx").on(table.marketplace, table.externalId)],
);

// Price observed at a point in time, for either a live listing or a catalog item's estimated value.
export const priceSnapshots = pgTable("price_snapshots", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalog_item_id").references(() => catalogItems.id, {
    onDelete: "cascade",
  }),
  priceCents: integer("price_cents").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedSearchesRelations = relations(savedSearches, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  savedSearch: one(savedSearches, {
    fields: [listings.savedSearchId],
    references: [savedSearches.id],
  }),
  priceSnapshots: many(priceSnapshots),
}));

export const catalogItemsRelations = relations(catalogItems, ({ many }) => ({
  priceSnapshots: many(priceSnapshots),
}));

export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  listing: one(listings, {
    fields: [priceSnapshots.listingId],
    references: [listings.id],
  }),
  catalogItem: one(catalogItems, {
    fields: [priceSnapshots.catalogItemId],
    references: [catalogItems.id],
  }),
}));
