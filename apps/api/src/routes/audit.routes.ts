import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireRole, requireScope } from "../middleware/rbac";

export const auditRouter = Router();

const STAFF_ROLES: UserRole[] = [
  UserRole.UNIVERSITY_ADMIN,
  UserRole.GOVERNMENT_ADMIN,
  UserRole.SUPER_ADMIN,
];

auditRouter.use(authenticate);

// Real audit trail, not mocked — every status change (including
// assignments, which are logged as a status/note pair by PATCH
// /api/issues/:id) already lands in ReportStatusEvent, so the dashboard's
// Audit Log page reads straight from that instead of separate log storage.
auditRouter.get("/", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const limitParam = req.query.limit;
  const limit = Math.min(
    200,
    Math.max(1, typeof limitParam === "string" ? Number(limitParam) || 100 : 100),
  );

  const events = await prisma.reportStatusEvent.findMany({
    where: { report: req.scope },
    include: {
      changedBy: { select: { id: true, name: true, role: true } },
      report: { select: { id: true, description: true, domain: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ events });
});
