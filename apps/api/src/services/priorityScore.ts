import { Severity } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Matches the mapping documented on the Severity enum in schema.prisma.
const SEVERITY_VALUES: Record<Severity, number> = {
  [Severity.LOW]: 1,
  [Severity.MEDIUM]: 2,
  [Severity.HIGH]: 3,
  [Severity.CRITICAL]: 4,
};

// Plain weighted arithmetic — no AI. Severity dominates (largest weight),
// AI confidence nudges the score up or down slightly, and each linked
// duplicate report adds a bit more: more citizens hitting the same issue
// is itself a signal worth surfacing, per the duplicate-detection design.
const SEVERITY_WEIGHT = 10;
const CONFIDENCE_WEIGHT = 5;
const DUPLICATE_WEIGHT = 3;

export function computePriorityScore(
  severity: Severity | null,
  aiConfidence: number | null,
  duplicateCount: number,
): number {
  const severityValue = severity ? SEVERITY_VALUES[severity] : 0;
  const confidence = aiConfidence ?? 0;

  const score =
    severityValue * SEVERITY_WEIGHT + confidence * CONFIDENCE_WEIGHT + duplicateCount * DUPLICATE_WEIGHT;

  return Number(score.toFixed(2));
}

// Recomputes and persists priorityScore for one report. Called whenever
// something feeding the formula changes: classification finishing, or
// another report getting linked to this one as a duplicate.
export async function recalculatePriorityScore(reportId: string) {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    select: { severity: true, aiConfidence: true },
  });

  const duplicateCount = await prisma.report.count({ where: { duplicateOfId: reportId } });

  const priorityScore = computePriorityScore(report.severity, report.aiConfidence, duplicateCount);

  return prisma.report.update({ where: { id: reportId }, data: { priorityScore } });
}
