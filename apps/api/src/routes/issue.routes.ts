import { Router } from "express";
import { ReportCategory, ReportStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireRole, requireScope } from "../middleware/rbac";
import { enqueueClassification } from "../services/classification";

export const issueRouter = Router();

const STAFF_ROLES: UserRole[] = [
  UserRole.FIELD_WORKER,
  UserRole.DEPARTMENT_OPERATOR,
  UserRole.MUNICIPAL_ADMIN,
  UserRole.SUPER_ADMIN,
];

// Every route below needs to know who's asking.
issueRouter.use(authenticate);

// Any authenticated user can file a report (normally a citizen, but staff
// filing on someone's behalf is allowed too). No requireScope() here —
// creating a report has no "existing data" to scope against yet.
issueRouter.post("/", async (req, res) => {
  const { description, cityId, latitude, longitude, address, photoUrls } = req.body ?? {};

  if (!description || !cityId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: "description, cityId, latitude, and longitude are required",
    });
  }

  const report = await prisma.report.create({
    data: {
      description,
      cityId,
      latitude,
      longitude,
      address: address ?? null,
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
      reportedById: req.user!.sub,
      status: ReportStatus.SUBMITTED,
    },
  });

  // `location` is an Unsupported geography type — Prisma Client can't set it
  // directly, so it's populated with one raw-SQL write right after insert.
  // (PostGIS point order is X, Y i.e. longitude, latitude.)
  await prisma.$executeRaw`
    UPDATE "Report"
    SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
    WHERE id = ${report.id}
  `;

  // Not awaited — the citizen gets their SUBMITTED report back immediately,
  // classification fills in category/severity/etc in the background.
  void enqueueClassification(report.id);

  res.status(201).json({ report });
});

// requireScope() bounds *which* reports come back: citizens see their own,
// field workers see what's assigned to them, department operators/municipal
// admins see their department/city, super admins see everything.
issueRouter.get("/", requireScope(), async (req, res) => {
  const { status, category } = req.query;
  const statusFilter = typeof status === "string" ? status : undefined;
  const categoryFilter = typeof category === "string" ? category : undefined;

  if (statusFilter && !Object.values(ReportStatus).includes(statusFilter as ReportStatus)) {
    return res.status(400).json({ error: "Invalid status filter" });
  }
  if (categoryFilter && !Object.values(ReportCategory).includes(categoryFilter as ReportCategory)) {
    return res.status(400).json({ error: "Invalid category filter" });
  }

  const reports = await prisma.report.findMany({
    where: {
      ...req.scope,
      ...(statusFilter ? { status: statusFilter as ReportStatus } : {}),
      ...(categoryFilter ? { category: categoryFilter as ReportCategory } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ reports });
});

issueRouter.get("/:id", requireScope(), async (req, res) => {
  const report = await prisma.report.findFirst({
    where: { id: String(req.params.id), ...req.scope },
  });

  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  res.json({ report });
});

// Only staff can update a report, and requireScope() still applies on top —
// e.g. a department operator can't patch a report outside their own
// city/department even though requireRole() let them through.
issueRouter.patch("/:id", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const existing = await prisma.report.findFirst({
    where: { id: String(req.params.id), ...req.scope },
  });

  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  const { status, assignedToId, departmentId, note } = req.body ?? {};

  if (status !== undefined && !Object.values(ReportStatus).includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const report = await prisma.report.update({
    where: { id: existing.id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
    },
  });

  // Every status change gets its own audit row instead of overwriting —
  // this is what powers the citizen's tracking timeline later.
  if (status !== undefined && status !== existing.status) {
    await prisma.reportStatusEvent.create({
      data: {
        reportId: report.id,
        status,
        note: note ?? null,
        changedById: req.user!.sub,
      },
    });
  }

  res.json({ report });
});
