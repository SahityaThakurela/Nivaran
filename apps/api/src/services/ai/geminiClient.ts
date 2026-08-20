const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

function guessMimeType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

// Calls Gemini's structured-output ("Interactions") API and returns the raw
// object it produced. Throws on any missing-key/network/HTTP/parsing
// problem — the caller (classifyReportWithAI) is responsible for falling
// back to the keyword classifier when that happens.
export async function callGemini(
  prompt: string,
  imageUrls: string[],
  jsonSchema: object,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  // Gemini accepts image URLs directly — no need to fetch/base64 them
  // ourselves, since photoUrls are already public Supabase Storage URLs.
  const input = [
    { type: "text", text: prompt },
    ...imageUrls.map((uri) => ({ type: "image", uri, mime_type: guessMimeType(uri) })),
  ];

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: jsonSchema,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API returned ${response.status}: ${body}`);
  }

  const data: unknown = await response.json();

  // Handles either response shape we might get back: the parsed object
  // directly, or wrapped in an `output_text` JSON string (matches how the
  // official client libraries expose it).
  if (typeof data === "object" && data !== null && "output_text" in data) {
    return JSON.parse((data as { output_text: string }).output_text);
  }
  return data;
}
