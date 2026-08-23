import { z } from "zod";
import { ChallengeDomain, Severity } from "@prisma/client";

// Single source of truth: Prisma's generated enums drive both the runtime
// validation (Zod) below and the JSON Schema we hand to OpenRouter, so the two
// can never drift out of sync with each other or with the database.
export const ClassificationSchema = z.object({
  domain: z.enum(ChallengeDomain),
  severity: z.enum(Severity),
  summary: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

// Same shape, expressed as a JSON Schema for OpenRouter structured output.
export const classificationJsonSchema = {
  type: "object",
  properties: {
    domain: {
      type: "string",
      enum: Object.values(ChallengeDomain),
      description: "Best-matching thematic domain for this societal challenge.",
    },
    severity: {
      type: "string",
      enum: Object.values(Severity),
      description: "How urgent/severe the challenge is.",
    },
    summary: {
      type: "string",
      description: "One-sentence, plain-language summary of the challenge.",
    },
    confidence: {
      type: "number",
      description: "Confidence in this classification, from 0 to 1.",
    },
  },
  required: ["domain", "severity", "summary", "confidence"],
};
