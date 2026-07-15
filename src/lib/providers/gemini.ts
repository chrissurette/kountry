import { parsedMenuSchema, ProviderError, type ImageRef, type ModelInfo, type ProviderAdapter, type Usage } from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Rough per-1M-token estimates for cost metering (docs/05's est_cost_usd) —
// not billing-accurate, just enough for the owner's spend dashboard to be
// directionally useful. Update as Gemini's published pricing changes.
const MODELS: ModelInfo[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", pricing: { inputPerMTokUsd: 0.3, outputPerMTokUsd: 2.5 } },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", pricing: { inputPerMTokUsd: 1.25, outputPerMTokUsd: 10 } },
];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string", nullable: true },
                price_cents: { type: "integer", nullable: true },
                price_note: { type: "string", nullable: true },
                confidence: { type: "number" },
              },
              required: ["name", "confidence"],
            },
          },
        },
        required: ["name", "items"],
      },
    },
  },
  required: ["sections"],
};

function buildPrompt(hints?: { currency?: string; knownSectionNames?: string[] }): string {
  return [
    "You are reading a photo of a handwritten restaurant menu. Transcribe it into",
    "structured JSON: sections, each with a name and a list of items. Each item has",
    "a name, an optional short description, a price in integer cents (price_cents),",
    "an optional price_note for non-numeric prices like 'MP' or 'market price' or a",
    "range like '12/18' (leave price_cents null in that case), and a confidence",
    "score from 0 to 1 reflecting how certain you are about the handwriting reading",
    "for that item (lower for illegible or ambiguous words).",
    hints?.currency ? `Prices are in ${hints.currency}.` : "",
    hints?.knownSectionNames?.length
      ? `This restaurant's usual section names include: ${hints.knownSectionNames.join(", ")}. Prefer matching one of these when the handwriting is ambiguous.`
      : "",
    "Preserve the original item order within each section. If the photo contains no",
    "readable menu content, return an empty sections array.",
  ]
    .filter(Boolean)
    .join(" ");
}

function estimateCost(model: string, usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number }): Usage {
  const info = MODELS.find((m) => m.id === model);
  const inputTokens = usageMetadata.promptTokenCount ?? 0;
  const outputTokens = usageMetadata.candidatesTokenCount ?? 0;
  const estCostUsd = info
    ? (inputTokens / 1_000_000) * (info.pricing.inputPerMTokUsd ?? 0) +
      (outputTokens / 1_000_000) * (info.pricing.outputPerMTokUsd ?? 0)
    : 0;
  return { inputTokens, outputTokens, imageCount: 1, estCostUsd };
}

export function createGeminiAdapter(apiKey: string): ProviderAdapter {
  return {
    id: "gemini",
    capabilities: new Set(["vision"]),
    models: (cap) => (cap === "vision" ? MODELS : []),
    vision: {
      async parseMenu(image: ImageRef, opts) {
        const res = await fetch(`${API_BASE}/models/${encodeURIComponent(opts.model)}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: buildPrompt(opts.hints) },
                  { inline_data: { mime_type: image.mimeType, data: Buffer.from(image.bytes).toString("base64") } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
        });

        if (res.status === 401 || res.status === 403) {
          throw new ProviderError("Gemini API key was rejected.", "auth_invalid");
        }
        if (res.status === 429) {
          throw new ProviderError("Gemini rate limit hit — try again shortly.", "rate_limited");
        }
        if (!res.ok) {
          throw new ProviderError(`Gemini request failed (${res.status}): ${await res.text()}`, "transient");
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const finishReason = candidate?.finishReason;
        if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
          throw new ProviderError("Gemini declined to process this image.", "content_refused");
        }

        const text = candidate?.content?.parts?.[0]?.text;
        if (typeof text !== "string") {
          throw new ProviderError("Gemini returned no parseable content.", "invalid_response");
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(text);
        } catch {
          throw new ProviderError("Gemini's response was not valid JSON.", "invalid_response");
        }

        const parsed = parsedMenuSchema.safeParse(parsedJson);
        if (!parsed.success) {
          throw new ProviderError(
            `Gemini's response didn't match the expected menu shape: ${parsed.error.message}`,
            "invalid_response"
          );
        }

        return { menu: parsed.data, usage: estimateCost(opts.model, data.usageMetadata ?? {}) };
      },
    },
  };
}
