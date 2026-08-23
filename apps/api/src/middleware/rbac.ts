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
// "a Municipal Admin only ever sees their own city's data" etc, so route
// handlers never need to re-derive it themselves. Must run after
// `authenticate`.
export function requireScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    switch (user.role as UserRole) {
      case UserRole.SUPER_ADMIN:
        req.scope = {};
        break;
      case UserRole.MUNICIPAL_ADMIN:
        req.scope = { cityId: user.cityId };
        break;
      case UserRole.DEPARTMENT_OPERATOR:
        req.scope = { cityId: user.cityId, departmentId: user.departmentId };
        break;
      case UserRole.FIELD_WORKER:
        req.scope = { assignedToId: user.sub };
        break;
      case UserRole.CITIZEN:
        // Citizens see every report filed in their own city (Nearby/Home
        // feeds are meant to be community-wide, not just "my reports").
        // GET /api/issues?mine=true narrows this back to reportedById for
        // the "My Reports" screen.
        req.scope = { cityId: user.cityId };
        break;
      default:
        return res.status(403).json({ error: "Unknown role" });
    }

    next();
  };
}
