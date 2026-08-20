import { Router } from "express";
import { ReportStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/rbac";

export const taskRouter = Router();

// There's no separate Task model — a "task" is just a Report that's been
// assigned to a field worker. These two routes are that field worker's own
// accept/complete actions on their own assignment (ownership-checked below);
// staff overrides/reassignment still go through PATCH /api/issues/:id.
taskRouter.use(authenticate);

taskRouter.post("/:id/accept", requireRole(UserRole.FIELD_WORKER), async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: String(req.params.id) } });

  // Same report either doesn't exist or isn't assigned to this worker —
  // 404 either way so we don't reveal which.
  if (!report || report.assignedToId !== req.user!.sub) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (report.status !== ReportStatus.ASSIGNED) {
    return res.status(409).json({ error: `Cannot accept a task in status ${report.status}` });
  }

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { status: ReportStatus.IN_PROGRESS },
  });

  await prisma.reportStatusEvent.create({
    data: {
      reportId: report.id,
      status: ReportStatus.IN_PROGRESS,
      note: "Accepted by field worker",
      changedById: req.user!.sub,
    },
  });

  res.json({ report: updated });
});

taskRouter.post("/:id/complete", requireRole(UserRole.FIELD_WORKER), async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: String(req.params.id) } });

  if (!report || report.assignedToId !== req.user!.sub) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (report.status !== ReportStatus.IN_PROGRESS) {
    return res.status(409).json({ error: `Cannot complete a task in status ${report.status}` });
  }

  const { resolutionEvidenceUrls, note } = req.body ?? {};

  if (!Array.isArray(resolutionEvidenceUrls) || resolutionEvidenceUrls.length === 0) {
    return res.status(400).json({ error: "resolutionEvidenceUrls (a non-empty array) is required" });
  }

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { status: ReportStatus.RESOLVED, resolutionEvidenceUrls },
  });

  await prisma.reportStatusEvent.create({
    data: {
      reportId: report.id,
      status: ReportStatus.RESOLVED,
      note: note ?? null,
      changedById: req.user!.sub,
    },
  });

  res.json({ report: updated });
});
