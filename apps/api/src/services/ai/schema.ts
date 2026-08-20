import { z } from "zod";
import { ReportCategory, Severity } from "@prisma/client";

// Single source of truth: Prisma's generated enums drive both the runtime
// validation (Zod) below and the JSON Schema we hand to Gemini, so the two
// can never drift out of sync with each other or with the database.
export const ClassificationSchema = z.object({
  category: z.enum(ReportCategory),
  severity: z.enum(Severity),
  summary: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

// Same shape, expressed as a JSON Schema for Gemini's structured-output mode.
export const classificationJsonSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: Object.values(ReportCategory),
      description: "Best-matching civic issue category.",
    },
    severity: {
      type: "string",
      enum: Object.values(Severity),
      description: "How urgent/severe the issue is.",
    },
    summary: {
      type: "string",
      description: "One-sentence, plain-language summary of the issue.",
    },
    confidence: {
      type: "number",
      description: "Confidence in this classification, from 0 to 1.",
    },
  },
  required: ["category", "severity", "summary", "confidence"],
};
