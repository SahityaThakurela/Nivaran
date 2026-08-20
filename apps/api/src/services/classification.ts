// Placeholder for the hosted multimodal-LLM classification step (built as
// its own module later). A freshly created Report is SUBMITTED with
// category/severity/aiSummary/aiConfidence all null; this is where they'd
// get filled in. For now it just logs, so POST /api/issues already calls
// it fire-and-forget and nothing has to change here once the real
// implementation lands.
export async function enqueueClassification(reportId: string): Promise<void> {
  console.log(`[classification] TODO: classify report ${reportId} via hosted LLM`);
}
