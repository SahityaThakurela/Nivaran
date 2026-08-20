// Must match the `vector(768)` column in schema.prisma — if you ever change
// one, change the other.
export const EMBEDDING_DIMENSIONS = 768;

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

// Returns a 768-dim embedding for the given text, or null if anything goes
// wrong (missing key, network error, unexpected shape). Callers treat null
// as "skip the semantic-similarity stage," the same fallback philosophy as
// the LLM classifier — never a fatal error.
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[embeddings] GEMINI_API_KEY is not set, skipping embedding generation");
    return null;
  }

  try {
    const response = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        embedContentConfig: { outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
    });

    if (!response.ok) {
      console.error(`[embeddings] Gemini embedContent returned ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = (await response.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;

    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
      console.error("[embeddings] Unexpected embedding response shape:", data);
      return null;
    }

    return values;
  } catch (error) {
    console.error("[embeddings] Failed to generate embedding:", error);
    return null;
  }
}
