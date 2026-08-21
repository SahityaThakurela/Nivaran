import { PrismaClient } from "@prisma/client";

// Supabase's transaction pooler (port 6543 / *pooler.supabase.com) does not
// support Postgres prepared statements. Without these query params Prisma
// throws "prepared statement already exists" / "does not exist" under load
// (e.g. Promise.all of several queries on one route).
function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const isPooler =
      url.port === "6543" || url.hostname.includes("pooler.supabase.com");
    if (isPooler) {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("connection_limit", "1");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const url = databaseUrl();

// A single shared Prisma Client instance, reused across the whole app instead
// of creating a new one per request (each instance opens its own connection
// pool against Postgres).
export const prisma = new PrismaClient(
  url ? { datasources: { db: { url } } } : undefined,
);
