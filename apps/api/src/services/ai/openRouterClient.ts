const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

// Calls OpenRouter's OpenAI-compatible chat API with JSON-schema structured
// output and returns the parsed object. Throws on missing-key / network /
// HTTP / parse problems — classifyReportWithAI falls back to keywords.
export async function callOpenRouter(
  prompt: string,
  imageUrls: string[],
  jsonSchema: object,
  schemaName = "societal_challenge_classification",
): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  for (const url of imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:4000",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "Nivaran Societal Innovation Platform",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content }],
      // Without an explicit cap, OpenRouter defaults max_tokens to the
      // model's absolute ceiling (65535 for Gemini 2.5 Flash), which this
      // account can't afford and fails every call with a 402 — silently,
      // since every caller here treats a thrown error as "fall back."
      // Our JSON outputs are a few hundred tokens at most, and thinking
      // isn't needed for a structured classification/validation task, so
      // both are capped tight.
      max_tokens: 1024,
      reasoning: { max_tokens: 0 },
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: {
            ...jsonSchema,
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter API returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter response missing message content");
  }

  return JSON.parse(text);
}
