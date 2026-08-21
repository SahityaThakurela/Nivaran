// Must match the `vector(768)` column in schema.prisma — if you ever change
// one, change the other.
export const EMBEDDING_DIMENSIONS = 768;

const EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small";

// Returns a 768-dim embedding for the given text, or null if anything goes
// wrong (missing key, network error, unexpected shape). Callers treat null
// as "skip the semantic-similarity stage," the same fallback philosophy as
// the LLM classifier — never a fatal error.
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("[embeddings] OPENROUTER_API_KEY is not set, skipping embedding generation");
    return null;
  }

  try {
    const response = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:4000",
        "X-Title": process.env.OPENROUTER_APP_TITLE ?? "Nivaran Civic Platform",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.error(`[embeddings] OpenRouter embeddings returned ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const values = data.data?.[0]?.embedding;

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
