import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";

// A Prisma `where` fragment. Routes spread this into their own query
// instead of writing per-route scope logic.
export type Scope = Record<string, unknown>;

declare global {
  namespace Express {
    interface Request {
      scope?: Scope;
    }
  }
}

// Blocks the request unless req.user.role is one of the allowed roles.
// Must run after `authenticate`.
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: "Insufficient role for this action" });
    }
    next();
  };
}

// Attaches req.scope based on req.user.role — the single place that encodes
// "a Government Admin only ever sees their own district's data" etc, so
// route handlers never need to re-derive it themselves. Must run after
// `authenticate`.
export function requireScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    switch (user.role as UserRole) {
      case UserRole.SUPER_ADMIN:
        // Dept. of Higher & Technical Education, Govt of Jharkhand — sees
        // every challenge across every district and university.
        req.scope = {};
        break;
      case UserRole.GOVERNMENT_ADMIN:
        // District-level oversight/analytics — replaces MUNICIPAL_ADMIN.
        if (!user.cityId) {
          return res.status(400).json({ error: "Your account has no district assigned" });
        }
        req.scope = { cityId: user.cityId };
        break;
      case UserRole.UNIVERSITY_ADMIN:
        // Sees only challenges routed to their own institution.
        if (!user.universityId) {
          return res.status(400).json({ error: "Your account has no university assigned" });
        }
        req.scope = { universityId: user.universityId };
        break;
      case UserRole.CITIZEN:
        // Citizens see every challenge filed in their own district (Nearby/Home
        // feeds are meant to be community-wide, not just "my reports").
        // GET /api/issues?mine=true narrows this back to reportedById for
        // the "My Reports" screen. cityId is a required column on Report, so a
        // literal `null` filter (citizen with no city yet) isn't a valid
        // Prisma filter — fall back to an impossible match instead of a 500.
        req.scope = user.cityId ? { cityId: user.cityId } : { id: "__no_city__" };
        break;
      default:
        return res.status(403).json({ error: "Unknown role" });
    }

    next();
  };
}
