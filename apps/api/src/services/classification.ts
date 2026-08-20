import { classifyAndUpdateReport } from "./ai/classify";

// Called fire-and-forget from POST /api/issues right after a report is
// created. Errors are caught here (not re-thrown) since nothing is awaiting
// this — a failed classification should never crash the request that
// triggered it, and classifyAndUpdateReport already falls back to the
// keyword classifier before this would even be reached.
export async function enqueueClassification(reportId: string): Promise<void> {
  try {
    await classifyAndUpdateReport(reportId);
  } catch (error) {
    console.error(`[classification] Failed to classify report ${reportId}:`, error);
  }
}
