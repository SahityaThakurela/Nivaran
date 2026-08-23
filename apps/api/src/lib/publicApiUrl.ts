import type { Request } from "express";

/** Builds an absolute API origin for URLs returned to mobile/web clients. */
export function getPublicApiUrl(req: Request): string {
  const fromEnv = process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "https";
  const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  if (!host) {
    return `http://localhost:${process.env.PORT ?? 4000}`;
  }
  return `${proto}://${host}`;
}
