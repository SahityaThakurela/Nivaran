import { callOpenRouter } from "./openRouterClient";
import {
  ReportValidationSchema,
  reportValidationJsonSchema,
  MismatchType,
  type ReportValidationResult,
} from "./reportValidationSchema";

// Below this confidence we accept the report even if the model leaned
// "invalid" — an unsure model shouldn't be allowed to block a genuine
// citizen report. Tune via env if false rejections/acceptances show up
// during testing.
const DEFAULT_MIN_CONFIDENCE_TO_REJECT = 0.55;

function getMinConfidenceToReject(): number {
  const raw = Number(process.env.REPORT_VALIDATION_MIN_CONFIDENCE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : DEFAULT_MIN_CONFIDENCE_TO_REJECT;
}

// Set REPORT_VALIDATION_ENABLED=false to disable this check entirely
// (e.g. if OpenRouter is rate-limited mid-demo and you'd rather accept
// everything than block submissions).
function isValidationEnabled(): boolean {
  return process.env.REPORT_VALIDATION_ENABLED !== "false";
}

const VALIDATION_PROMPT = `You are a fraud/quality-control checker for a societal-innovation platform run
by the Department of Higher & Technical Education, Government of Jharkhand. Citizens submit
photos and descriptions of real local challenges (education, healthcare, agriculture, water
resources, environment, energy, urban development, accessibility, public administration, rural
livelihoods, etc.) so they can be routed to a university for a solution.

Your ONLY job: decide whether the attached photo(s) are genuine, relevant evidence that supports
the written description below. You are NOT judging severity, domain, or writing quality.

Mark isValid = false when:
- The photo shows something completely unrelated to the description (e.g. a laptop, a selfie, a
  food plate, a pet, a random product, a screenshot of an app or chat, a meme) instead of the
  claimed real-world issue.
- The photo shows no visible problem at all even though the description claims an urgent,
  observable issue (e.g. description says "huge pothole" but the photo is a clear, undamaged road).
- The photo and description clearly describe two different things or two different places/subjects.
- The photo is a stock image, drawing, AI-generated image, or clearly staged/test content rather
  than a real on-the-ground photo.
- The description itself is gibberish, a placeholder ("test", "asdf", "hi"), or has nothing to do
  with a societal challenge.

Mark isValid = true when:
- The photo plausibly depicts the situation described, even if the framing/lighting/angle is
  imperfect, it's partially obstructed, or it's just one supporting angle of a larger problem.
- Be lenient about photo quality — only reject on RELEVANCE grounds, not on prettiness.

Respond only with the requested JSON — no extra commentary. "reason" must be short, plain
language, and speak directly to the citizen who submitted it (e.g. "The photo shows a laptop on a
desk, which doesn't match your description of a damaged road.").

Submitted description: `;

export interface ReportValidationOutcome extends ReportValidationResult {
  method: "llm" | "skipped-no-photo" | "skipped-disabled" | "unavailable";
  // The raw model verdict before the confidence gate below is applied —
  // useful for logging/debugging even when the final decision differs.
  rawIsValid: boolean;
}

// Fail-open outcome shared by every path that can't actually run the check
// (no photo attached, feature disabled, or the AI call itself failed) — a
// report should never get blocked by infrastructure trouble, only by an
// actual mismatch the model is confident about.
function acceptOutcome(
  method: ReportValidationOutcome["method"],
  reason: string,
): ReportValidationOutcome {
  return {
    isValid: true,
    rawIsValid: true,
    confidence: 0,
    reason,
    imageFindings: "",
    mismatchType: MismatchType.NONE,
    method,
  };
}

// Checks whether the submitted photo(s) actually support the submitted
// description, using a vision-capable LLM via OpenRouter. Never throws —
// on any AI/network failure it fails open (accepts) so outages never block
// legitimate citizen reports; it only rejects when the model is reasonably
// confident there's a genuine mismatch.
export async function validateReportSubmission(
  description: string,
  photoUrls: string[],
): Promise<ReportValidationOutcome> {
  if (!isValidationEnabled()) {
    return acceptOutcome("skipped-disabled", "Image validation is currently disabled.");
  }

  if (photoUrls.length === 0) {
    return acceptOutcome(
      "skipped-no-photo",
      "No photo attached — nothing to verify against the description.",
    );
  }

  try {
    const raw = await callOpenRouter(
      VALIDATION_PROMPT + description,
      photoUrls,
      reportValidationJsonSchema,
      "report_photo_validation",
    );
    const parsed = ReportValidationSchema.parse(raw);

    const minConfidence = getMinConfidenceToReject();
    const finalIsValid = parsed.isValid || parsed.confidence < minConfidence;

    return { ...parsed, isValid: finalIsValid, rawIsValid: parsed.isValid, method: "llm" };
  } catch (error) {
    console.error(
      "[ai] OpenRouter report validation failed — accepting report to avoid blocking a genuine submission:",
      error,
    );
    return acceptOutcome("unavailable", "Automatic photo validation was unavailable.");
  }
}
