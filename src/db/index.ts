import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Vercel's Postgres/Neon storage integration doesn't always name the env var
// DATABASE_URL (it may be POSTGRES_URL or DATABASE_URL_UNPOOLED depending on
// how it was provisioned), so fall back across the common names.
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error("No database connection string found (checked DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED)");
}

const globalForDb = globalThis as unknown as { queryClient?: postgres.Sql };

const queryClient = globalForDb.queryClient ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
