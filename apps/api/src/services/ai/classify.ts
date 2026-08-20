import { prisma } from "../../lib/prisma";
import { callGemini } from "./geminiClient";
import { classifyByKeyword } from "./keywordFallback";
import { generateEmbedding } from "./embeddings";
import { ClassificationSchema, classificationJsonSchema, type ClassificationResult } from "./schema";

const PROMPT_PREFIX = `You are a triage assistant for a municipal civic-issue reporting platform.
Read the citizen's report below (and any attached photos) and classify it.
Respond only with the requested JSON — no extra commentary.

Report description: `;

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
    const raw = await callGemini(PROMPT_PREFIX + description, photoUrls, classificationJsonSchema);
    const parsed = ClassificationSchema.parse(raw);
    return { ...parsed, method: "llm" };
  } catch (error) {
    console.error("[ai] Gemini classification failed, falling back to keyword classifier:", error);
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

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      category: result.category,
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

  return updated;
}
