import jwt from "jsonwebtoken";

// Fail fast at startup rather than signing tokens with `undefined`. Captured
// in a typed const here so TS narrows it to `string` for the functions below
// (narrowing from the guard alone doesn't cross into closures).
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error("JWT_SECRET is not set in apps/api/.env");
}
const JWT_SECRET: string = rawSecret;

// What we embed in every token. The RBAC middleware (next step) reads
// `role`/`cityId`/`departmentId` straight off this, no extra DB lookup needed.
export interface AuthTokenPayload {
  sub: string;
  role: string;
  cityId: string | null;
  departmentId: string | null;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
