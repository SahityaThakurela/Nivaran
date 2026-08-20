import { prisma } from "../../lib/prisma";
import { callGemini } from "./geminiClient";
import { classifyByKeyword } from "./keywordFallback";
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
// Shared by POST /api/ai/analyze-report and the fire-and-forget call from
// POST /api/issues.
export async function classifyAndUpdateReport(reportId: string) {
  const report = await prisma.report.findUniqueOrThrow({ where: { id: reportId } });
  const result = await classifyReportWithAI(report.description, report.photoUrls);

  return prisma.report.update({
    where: { id: reportId },
    data: {
      category: result.category,
      severity: result.severity,
      aiSummary: result.summary,
      aiConfidence: result.confidence,
    },
  });
}
