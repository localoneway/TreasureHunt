import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Vercel's Postgres/Neon storage integration doesn't always name the env var
// DATABASE_URL (it may be POSTGRES_URL or DATABASE_URL_UNPOOLED depending on
// how it was provisioned), so fall back across the common names.
function getConnectionString(): string {
  const connectionString = getEnv("DATABASE_URL") || getEnv("POSTGRES_URL") || getEnv("DATABASE_URL_UNPOOLED");
  if (!connectionString) {
    throw new Error("No database connection string found (checked DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED)");
  }
  return connectionString;
}

const globalForDb = globalThis as unknown as { queryClient?: postgres.Sql; db?: Db };

// Lazy — resolving the connection string (and throwing if it's missing) only
// happens on first actual query, not at import time. Next.js loads this module
// while collecting page data during `next build`, even for dynamic routes, so
// throwing here unconditionally would fail the build before a database is
// ever configured.
function getDb(): Db {
  if (!globalForDb.db) {
    const queryClient = globalForDb.queryClient ?? postgres(getConnectionString(), { prepare: false });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.queryClient = queryClient;
    }
    globalForDb.db = drizzle(queryClient, { schema });
  }
  return globalForDb.db;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
