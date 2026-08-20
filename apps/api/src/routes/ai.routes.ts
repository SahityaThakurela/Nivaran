import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireScope } from "../middleware/rbac";
import { classifyAndUpdateReport } from "../services/ai/classify";

export const aiRouter = Router();

aiRouter.use(authenticate);

// Runs (or re-runs) AI classification for a report. requireScope() ensures
// you can only trigger this for a report you're allowed to see in the
// first place — same rule as GET /api/issues/:id.
aiRouter.post("/analyze-report", requireScope(), async (req, res) => {
  const { reportId } = req.body ?? {};

  if (!reportId) {
    return res.status(400).json({ error: "reportId is required" });
  }

  const existing = await prisma.report.findFirst({
    where: { id: reportId, ...req.scope },
  });

  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  const report = await classifyAndUpdateReport(reportId);

  res.json({ report });
});
