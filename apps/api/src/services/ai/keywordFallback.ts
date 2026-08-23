import { ChallengeDomain, Severity } from "@prisma/client";
import type { ClassificationResult } from "./schema";

// Deliberately rough keyword -> domain map. This only runs when the LLM
// call itself has already failed, so the bar is "produce something
// non-blank," not "be accurate."
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  [ChallengeDomain.EDUCATION]: ["school", "college", "student", "teacher", "literacy", "education", "classroom"],
  [ChallengeDomain.HEALTHCARE]: ["hospital", "clinic", "health", "disease", "medicine", "doctor", "sanitation"],
  [ChallengeDomain.AGRICULTURE]: ["crop", "farmer", "farming", "irrigation", "soil", "agriculture", "pesticide"],
  [ChallengeDomain.WATER_RESOURCES]: ["water supply", "no water", "pipeline", "borewell", "drinking water", "groundwater"],
  [ChallengeDomain.ENVIRONMENT]: ["pollution", "deforestation", "waste", "garbage", "environment", "climate"],
  [ChallengeDomain.ENERGY]: ["power cut", "electricity", "transformer", "solar", "energy", "grid"],
  [ChallengeDomain.URBAN_DEVELOPMENT]: ["road", "drainage", "street", "housing", "urban", "infrastructure"],
  [ChallengeDomain.ACCESSIBILITY]: ["disability", "wheelchair", "accessible", "barrier-free", "ramp"],
  [ChallengeDomain.PUBLIC_ADMINISTRATION]: ["government office", "public service", "corruption", "delay", "administration"],
  [ChallengeDomain.RURAL_LIVELIHOODS]: ["livelihood", "employment", "artisan", "self-help group", "rural", "income"],
};

export function classifyByKeyword(description: string): ClassificationResult {
  const text = description.toLowerCase();

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return {
        domain: domain as ChallengeDomain,
        severity: Severity.MEDIUM,
        summary: description.slice(0, 200),
        confidence: 0.3,
      };
    }
  }

  return {
    domain: ChallengeDomain.OTHER,
    severity: Severity.MEDIUM,
    summary: description.slice(0, 200),
    confidence: 0.2,
  };
}
