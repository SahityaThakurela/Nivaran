import { ReportCategory, Severity } from "@prisma/client";
import type { ClassificationResult } from "./schema";

// Deliberately rough keyword -> category map. This only runs when the LLM
// call itself has already failed, so the bar is "produce something
// non-blank," not "be accurate."
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  [ReportCategory.ROADS]: ["pothole", "road", "street", "footpath", "pavement", "asphalt"],
  [ReportCategory.SANITATION]: ["garbage", "trash", "waste", "litter", "dump", "sewage smell"],
  [ReportCategory.WATER_SUPPLY]: ["water supply", "no water", "pipeline", "leak", "tap"],
  [ReportCategory.ELECTRICITY]: ["power cut", "electricity", "transformer", "wire", "shock"],
  [ReportCategory.DRAINAGE]: ["drain", "sewer", "flooding", "waterlogging", "clogged"],
  [ReportCategory.STREETLIGHT]: ["streetlight", "street light", "lamp post", "dark street"],
  [ReportCategory.PUBLIC_SAFETY]: ["accident", "crime", "unsafe", "fight", "fire", "danger"],
  [ReportCategory.PARKS_AND_TREES]: ["park", "tree", "garden", "branch", "playground"],
  [ReportCategory.STRAY_ANIMALS]: ["stray", "dog", "cattle", "animal", "cow", "monkey"],
};

export function classifyByKeyword(description: string): ClassificationResult {
  const text = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return {
        category: category as ReportCategory,
        severity: Severity.MEDIUM,
        summary: description.slice(0, 200),
        confidence: 0.3,
      };
    }
  }

  return {
    category: ReportCategory.OTHER,
    severity: Severity.MEDIUM,
    summary: description.slice(0, 200),
    confidence: 0.2,
  };
}
