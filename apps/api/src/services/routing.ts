import { ReportStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Routes a classified challenge to a university: prefer an institution in the
// same district (cityId) whose specializations cover the domain, falling
// back to any matching university state-wide. If nothing matches, the report
// is left ASSIGNED-less for a Government/Super Admin to route by hand.
//
// Called once, right after AI classification sets `domain` — this is the
// piece the old Department model promised in a comment but never actually
// implemented.
export async function routeReportToUniversity(reportId: string) {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    select: { id: true, domain: true, cityId: true, universityId: true },
  });

  // Already routed (e.g. re-run of /api/ai/analyze-report) or no domain to
  // route on yet — leave it alone.
  if (report.universityId || !report.domain) {
    return;
  }

  const sameDistrictMatch = await prisma.university.findFirst({
    where: { cityId: report.cityId, specializations: { has: report.domain } },
    orderBy: { name: "asc" },
  });

  const match =
    sameDistrictMatch ??
    (await prisma.university.findFirst({
      where: { specializations: { has: report.domain } },
      orderBy: { name: "asc" },
    }));

  if (!match) {
    return;
  }

  // No ReportStatusEvent here (same as classification itself) — there's no
  // human "changedBy" for an automated routing step. Status events start
  // once a University/Government Admin takes an explicit action via PATCH.
  await prisma.report.update({
    where: { id: reportId },
    data: { universityId: match.id, status: ReportStatus.ASSIGNED },
  });
}
