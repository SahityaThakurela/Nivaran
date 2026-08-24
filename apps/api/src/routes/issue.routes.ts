import { Router } from "express";
import { ChallengeDomain, ReportStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireRole, requireScope } from "../middleware/rbac";
import { enqueueClassification } from "../services/classification";
import { findDuplicateCandidates } from "../services/duplicateDetection";
import { recalculatePriorityScore } from "../services/priorityScore";
import { validateReportSubmission } from "../services/ai/validateReport";

export const issueRouter = Router();

const STAFF_ROLES: UserRole[] = [
  UserRole.UNIVERSITY_ADMIN,
  UserRole.GOVERNMENT_ADMIN,
  UserRole.SUPER_ADMIN,
];

// Every route below needs to know who's asking.
issueRouter.use(authenticate);

// Any authenticated user can file a challenge (normally a citizen, but staff
// filing on someone's behalf is allowed too). No requireScope() here —
// creating a report has no "existing data" to scope against yet.
issueRouter.post("/", async (req, res) => {
  const { description, cityId, latitude, longitude, address, photoUrls, domain } =
    req.body ?? {};

  if (!description || !cityId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: "description, cityId, latitude, and longitude are required",
    });
  }

  const domainValue =
    typeof domain === "string" && Object.values(ChallengeDomain).includes(domain as ChallengeDomain)
      ? (domain as ChallengeDomain)
      : undefined;

  // Only persist fetchable URLs. Local device paths (file://, content://) only
  // work on the uploader's phone and show as blank thumbs for everyone else.
  const sanitizedPhotoUrls = Array.isArray(photoUrls)
    ? photoUrls.filter(
        (url): url is string =>
          typeof url === "string" &&
          (/^https?:\/\//i.test(url) || url.startsWith("data:image/")),
      )
    : [];

  // Vision-LLM check: does the uploaded photo actually support the claimed
  // description, or is it something unrelated (e.g. a laptop photo attached
  // to a "damaged road" report)? Runs before we ever write the report, so a
  // mismatched submission never makes it into the queue at all — it fails
  // open (accepts) on any AI/network trouble, so outages never block a
  // genuine citizen report.
  const validation = await validateReportSubmission(description, sanitizedPhotoUrls);
  if (!validation.isValid) {
    return res.status(422).json({
      error: `Report rejected: ${validation.reason}`,
      rejection: {
        reason: validation.reason,
        imageFindings: validation.imageFindings,
        mismatchType: validation.mismatchType,
        confidence: validation.confidence,
      },
    });
  }

  const report = await prisma.report.create({
    data: {
      description,
      cityId,
      latitude,
      longitude,
      address: address ?? null,
      photoUrls: sanitizedPhotoUrls,
      ...(domainValue ? { domain: domainValue } : {}),
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
  // classification fills in domain/severity/etc (and auto-routes to a
  // university) in the background.
  void enqueueClassification(report.id);

  res.status(201).json({ report });
});

// requireScope() bounds *which* reports come back: citizens see their own
// district's challenges, university admins see what's routed to their
// institution, government/super admins see their district/everything.
issueRouter.get("/", requireScope(), async (req, res) => {
  const { status, domain, mine } = req.query;
  const statusFilter = typeof status === "string" ? status : undefined;
  const domainFilter = typeof domain === "string" ? domain : undefined;

  if (statusFilter && !Object.values(ReportStatus).includes(statusFilter as ReportStatus)) {
    return res.status(400).json({ error: "Invalid status filter" });
  }
  if (domainFilter && !Object.values(ChallengeDomain).includes(domainFilter as ChallengeDomain)) {
    return res.status(400).json({ error: "Invalid domain filter" });
  }

  // Citizens are district-scoped by default (Nearby/Home are community feeds).
  // "My Reports" opts back into reportedById-only via ?mine=true.
  const mineFilter =
    mine === "true" && req.user!.role === UserRole.CITIZEN
      ? { reportedById: req.user!.sub }
      : {};

  const reports = await prisma.report.findMany({
    where: {
      ...req.scope,
      ...mineFilter,
      ...(statusFilter ? { status: statusFilter as ReportStatus } : {}),
      ...(domainFilter ? { domain: domainFilter as ChallengeDomain } : {}),
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

// Staff-only "review" endpoint: surfaces scored duplicate candidates
// (geo + semantic similarity) so a human decides whether to link them —
// nothing here writes anything. Acting on it is a separate PATCH call.
issueRouter.get("/:id/duplicates", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const existing = await prisma.report.findFirst({
    where: { id: String(req.params.id), ...req.scope },
  });

  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  const radiusParam = req.query.radiusMeters;
  const radiusMeters = typeof radiusParam === "string" ? Number(radiusParam) : undefined;

  if (radiusMeters !== undefined && (!Number.isFinite(radiusMeters) || radiusMeters <= 0)) {
    return res.status(400).json({ error: "radiusMeters must be a positive number" });
  }

  const candidates = await findDuplicateCandidates(existing.id, { radiusMeters });

  res.json({ candidates });
});

// Only staff can update a report, and requireScope() still applies on top —
// e.g. a university admin can't patch a report outside their own
// institution even though requireRole() let them through.
issueRouter.patch("/:id", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const existing = await prisma.report.findFirst({
    where: { id: String(req.params.id), ...req.scope },
  });

  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  const {
    status,
    universityId,
    facultyMentor,
    teamNote,
    industryPartnerId,
    note,
    duplicateOfId,
  } = req.body ?? {};

  if (status !== undefined && !Object.values(ReportStatus).includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  // Linking a duplicate is how staff act on GET /:id/duplicates — nothing
  // gets marked a duplicate except through this explicit, human-driven call.
  if (duplicateOfId !== undefined && duplicateOfId !== null) {
    if (duplicateOfId === existing.id) {
      return res.status(400).json({ error: "A report cannot be a duplicate of itself" });
    }
    const target = await prisma.report.findUnique({ where: { id: duplicateOfId } });
    if (!target) {
      return res.status(400).json({ error: "duplicateOfId does not refer to an existing report" });
    }
  }

  // If duplicateOfId is being set and no explicit status was given, default
  // the status to DUPLICATE too — that's what linking one is for.
  const statusToApply =
    status !== undefined
      ? status
      : duplicateOfId !== undefined && duplicateOfId !== null
        ? ReportStatus.DUPLICATE
        : undefined;

  const report = await prisma.report.update({
    where: { id: existing.id },
    data: {
      ...(statusToApply !== undefined ? { status: statusToApply } : {}),
      ...(universityId !== undefined ? { universityId } : {}),
      ...(facultyMentor !== undefined ? { facultyMentor } : {}),
      ...(teamNote !== undefined ? { teamNote } : {}),
      ...(industryPartnerId !== undefined ? { industryPartnerId } : {}),
      ...(duplicateOfId !== undefined
        ? { duplicateOfId, isDuplicate: duplicateOfId !== null }
        : {}),
    },
  });

  // Every status change gets its own audit row instead of overwriting —
  // this is what powers the citizen's tracking timeline later.
  if (statusToApply !== undefined && statusToApply !== existing.status) {
    await prisma.reportStatusEvent.create({
      data: {
        reportId: report.id,
        status: statusToApply,
        note: note ?? null,
        changedById: req.user!.sub,
      },
    });
  }

  // Linking this report as a duplicate means the *original* just gained a
  // supporting report — its priority score factors in duplicate count, so
  // it needs recomputing too.
  if (duplicateOfId !== undefined && duplicateOfId !== null) {
    await recalculatePriorityScore(duplicateOfId);
  }

  res.json({ report });
});
