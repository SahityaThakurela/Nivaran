import { prisma } from "../../lib/prisma";
import { callOpenRouter } from "./openRouterClient";
import { classifyByKeyword } from "./keywordFallback";
import { generateEmbedding } from "./embeddings";
import { recalculatePriorityScore } from "../priorityScore";
import { routeReportToUniversity } from "../routing";
import { ClassificationSchema, classificationJsonSchema, type ClassificationResult } from "./schema";

const PROMPT_PREFIX = `You are a triage assistant for a societal-innovation platform run by the
Department of Higher & Technical Education, Government of Jharkhand. Citizens, community
organizations, local bodies, and government agencies submit local challenges (education,
healthcare, agriculture, water resources, environment, energy, urban development,
accessibility, public administration, rural livelihoods, etc.) that need evaluation and
routing to the right university/research institution.
Read the submitted challenge below (and any attached photos) and classify it.
Respond only with the requested JSON — no extra commentary.

Challenge description: `;

export interface ClassificationOutcome extends ClassificationResult {
  method: "llm" | "keyword-fallback";
}

// Tries the hosted LLM first; on ANY failure (missing key, network error,
// non-JSON response, or a response that fails the Zod schema check) it
// falls back to the keyword classifier instead of throwing, so a report
// always ends up with *some* classification.
export async function classifyReportWithAI(
  description: string,
  photoUrls: string[],
): Promise<ClassificationOutcome> {
  try {
    const raw = await callOpenRouter(PROMPT_PREFIX + description, photoUrls, classificationJsonSchema);
    const parsed = ClassificationSchema.parse(raw);
    return { ...parsed, method: "llm" };
  } catch (error) {
    console.error("[ai] OpenRouter classification failed, falling back to keyword classifier:", error);
    return { ...classifyByKeyword(description), method: "keyword-fallback" };
  }
}

// Classifies a report by id and writes the result straight back onto it.
// Also generates its description embedding here — this is the one place
// that "enriches" a report after creation, and duplicate detection (a
// later step) needs that embedding to exist before it can run.
// Shared by POST /api/ai/analyze-report and the fire-and-forget call from
// POST /api/issues.
export async function classifyAndUpdateReport(reportId: string) {
  const report = await prisma.report.findUniqueOrThrow({ where: { id: reportId } });
  const result = await classifyReportWithAI(report.description, report.photoUrls);

  await prisma.report.update({
    where: { id: reportId },
    data: {
      domain: result.domain,
      severity: result.severity,
      aiSummary: result.summary,
      aiConfidence: result.confidence,
    },
  });

  const embedding = await generateEmbedding(report.description);
  if (embedding) {
    // `embedding` is an Unsupported pgvector column — same reason `location`
    // is written via raw SQL rather than through the normal Prisma client.
    const vectorLiteral = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE "Report" SET embedding = ${vectorLiteral}::vector WHERE id = ${reportId}
    `;
  }

  // Now that the domain is known, try to auto-route this to a university —
  // the one piece the old schema promised but never implemented.
  await routeReportToUniversity(reportId);

  // Severity/confidence just changed, so priority needs recomputing too —
  // this is the final write, so its return value has every field current.
  return recalculatePriorityScore(reportId);
}
