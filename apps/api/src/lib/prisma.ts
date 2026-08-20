import { PrismaClient } from "@prisma/client";

// A single shared Prisma Client instance, reused across the whole app instead
// of creating a new one per request (each instance opens its own connection
// pool against Postgres).
export const prisma = new PrismaClient();
