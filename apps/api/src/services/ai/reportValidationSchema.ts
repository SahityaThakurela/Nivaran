import { z } from "zod";

// Why a report can fail image validation — surfaced to the citizen as the
// rejection reason, and useful to staff/analytics for spotting patterns
// (e.g. a spike in IRRELEVANT_SUBJECT might mean the capture flow is
// confusing people about what to photograph).
export const MismatchType = {
  NONE: "NONE",
  IRRELEVANT_SUBJECT: "IRRELEVANT_SUBJECT",
  NO_VISIBLE_ISSUE: "NO_VISIBLE_ISSUE",
  TEXT_IMAGE_MISMATCH: "TEXT_IMAGE_MISMATCH",
  LOW_QUALITY_UNVERIFIABLE: "LOW_QUALITY_UNVERIFIABLE",
  INAPPROPRIATE_OR_UNSAFE: "INAPPROPRIATE_OR_UNSAFE",
  SPAM_OR_TEST_SUBMISSION: "SPAM_OR_TEST_SUBMISSION",
} as const;

export const ReportValidationSchema = z.object({
  isValid: z.boolean(),
  confidence: z.number().min(0).max(1),
  // Short, citizen-facing explanation — shown directly in the app on rejection.
  reason: z.string().min(1).max(400),
  // What the model actually sees in the photo(s), independent of the verdict —
  // useful for debugging false rejections during the hackathon demo.
  imageFindings: z.string().min(1).max(300),
  mismatchType: z.enum(Object.values(MismatchType) as [string, ...string[]]),
});

export type ReportValidationResult = z.infer<typeof ReportValidationSchema>;

// Same shape, expressed as a JSON Schema for OpenRouter structured output.
export const reportValidationJsonSchema = {
  type: "object",
  properties: {
    isValid: {
      type: "boolean",
      description:
        "True only if the photo(s) plausibly show a real, physical societal/civic issue that is consistent with the written description.",
    },
    confidence: {
      type: "number",
      description: "Confidence in this verdict, from 0 to 1.",
    },
    reason: {
      type: "string",
      description:
        "One or two plain-language sentences explaining the verdict, written for the citizen who submitted the report (not for developers).",
    },
    imageFindings: {
      type: "string",
      description: "Brief, neutral description of what the photo(s) actually depict.",
    },
    mismatchType: {
      type: "string",
      enum: Object.values(MismatchType),
      description:
        "NONE if valid. Otherwise the single best-fitting reason it was rejected.",
    },
  },
  required: ["isValid", "confidence", "reason", "imageFindings", "mismatchType"],
};
