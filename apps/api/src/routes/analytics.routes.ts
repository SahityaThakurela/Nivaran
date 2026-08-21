import { Router } from "express";
import { ReportCategory, ReportStatus, Severity, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireRole, requireScope, type Scope } from "../middleware/rbac";

export const analyticsRouter = Router();

const STAFF_ROLES: UserRole[] = [
  UserRole.FIELD_WORKER,
  UserRole.DEPARTMENT_OPERATOR,
  UserRole.MUNICIPAL_ADMIN,
  UserRole.SUPER_ADMIN,
];

const OPEN_STATUSES: ReportStatus[] = [
  ReportStatus.SUBMITTED,
  ReportStatus.ACKNOWLEDGED,
  ReportStatus.ASSIGNED,
  ReportStatus.IN_PROGRESS,
];

interface GroupRow {
  _count: number;
  [key: string]: unknown;
}

// Builds a { ENUM_VALUE: count } map with every enum value present
// (defaulting to 0), so dashboard code never has to guard against a
// missing key just because that bucket happened to have zero reports.
function toCountMap<T extends string>(enumValues: readonly T[], groups: GroupRow[], key: string): Record<T, number> {
  const map = Object.fromEntries(enumValues.map((value) => [value, 0])) as Record<T, number>;
  for (const group of groups) {
    const value = group[key] as T | null;
    if (value !== null && value in map) {
      map[value] = group._count;
    }
  }
  return map;
}

analyticsRouter.use(authenticate);

// requireScope() keeps this consistent with every other route: a Municipal
// Admin only ever sees their own city's numbers, a Department Operator only
// their department's, etc.
analyticsRouter.get("/overview", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const scope: Scope = req.scope ?? {};

  // Run sequentially — PgBouncer transaction pooling + concurrent Prisma
  // queries on one client still flaky even with pgbouncer=true.
  const statusGroups = await prisma.report.groupBy({ by: ["status"], where: scope, _count: true });
  const categoryGroups = await prisma.report.groupBy({ by: ["category"], where: scope, _count: true });
  const severityGroups = await prisma.report.groupBy({ by: ["severity"], where: scope, _count: true });
  const totalReports = await prisma.report.count({ where: scope });
  const openReports = await prisma.report.count({ where: { ...scope, status: { in: OPEN_STATUSES } } });
  const pendingClassification = await prisma.report.count({ where: { ...scope, category: null } });
  const resolvedEvents = await prisma.reportStatusEvent.findMany({
    where: { status: ReportStatus.RESOLVED, report: scope },
    select: { createdAt: true, report: { select: { createdAt: true } } },
  });

  // Plain arithmetic average, same "no AI here" philosophy as priorityScore.
  const resolutionHours = resolvedEvents.map(
    (event) => (event.createdAt.getTime() - event.report.createdAt.getTime()) / (1000 * 60 * 60),
  );
  const averageResolutionHours =
    resolutionHours.length > 0
      ? Number((resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length).toFixed(1))
      : null;

  res.json({
    totalReports,
    openReports,
    pendingClassification,
    averageResolutionHours,
    byStatus: toCountMap(Object.values(ReportStatus), statusGroups, "status"),
    byCategory: toCountMap(Object.values(ReportCategory), categoryGroups, "category"),
    bySeverity: toCountMap(Object.values(Severity), severityGroups, "severity"),
  });
});
