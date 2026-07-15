import { parsedMenuSchema, ProviderError, type ImageRef, type ModelInfo, type ProviderAdapter, type ProviderId, type Usage } from "./types";

/**
 * Shared implementation for any vendor exposing an OpenAI-compatible
 * /chat/completions endpoint with structured outputs (json_schema response
 * format) and image_url content parts. OpenAI itself and xAI's Grok API
 * both work this way (xAI's API is explicitly OpenAI-wire-compatible), so
 * this one function backs both adapters — only base URL, id, and model
 * catalog differ (see openai.ts / xai.ts).
 */

const JSON_SCHEMA = {
  name: "parsed_menu",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: ["string", "null"] },
                  price_cents: { type: ["integer", "null"] },
                  price_note: { type: ["string", "null"] },
                  confidence: { type: "number" },
                },
                required: ["name", "description", "price_cents", "price_note", "confidence"],
              },
            },
          },
          required: ["name", "items"],
        },
      },
    },
    required: ["sections"],
  },
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

function estimateCost(model: string, models: ModelInfo[], promptTokens: number, completionTokens: number): Usage {
  const info = models.find((m) => m.id === model);
  const estCostUsd = info
    ? (promptTokens / 1_000_000) * (info.pricing.inputPerMTokUsd ?? 0) +
      (completionTokens / 1_000_000) * (info.pricing.outputPerMTokUsd ?? 0)
    : 0;
  return { inputTokens: promptTokens, outputTokens: completionTokens, imageCount: 1, estCostUsd };
}

async function chatCompletion(
  config: { id: ProviderId; baseUrl: string; models: ModelInfo[]; apiKey: string },
  body: Record<string, unknown>
): Promise<{ content: string; usage: Usage }> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 || res.status === 403) {
    throw new ProviderError(`${config.id} API key was rejected.`, "auth_invalid");
  }
  if (res.status === 429) {
    throw new ProviderError(`${config.id} rate limit hit — try again shortly.`, "rate_limited");
  }
  if (!res.ok) {
    throw new ProviderError(`${config.id} request failed (${res.status}): ${await res.text()}`, "transient");
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) {
    throw new ProviderError(`${config.id} declined to process this request.`, "content_refused");
  }

  const content = choice?.message?.content;
  if (typeof content !== "string") {
    throw new ProviderError(`${config.id} returned no parseable content.`, "invalid_response");
  }

  const usage = data.usage ?? {};
  return {
    content,
    usage: estimateCost(body.model as string, config.models, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0),
  };
}

export function createOpenAiCompatibleAdapter(config: {
  id: ProviderId;
  baseUrl: string;
  models: ModelInfo[];
  apiKey: string;
}): ProviderAdapter {
  return {
    id: config.id,
    capabilities: new Set(["vision", "text"]),
    models: (cap) => (cap === "vision" || cap === "text" ? config.models : []),
    text: {
      async generate(prompt, opts) {
        const { content, usage } = await chatCompletion(config, {
          model: opts.model,
          messages: [{ role: "user", content: prompt }],
        });
        return { text: content, usage: { ...usage, imageCount: 0 } };
      },

      async generateJson(opts) {
        const { content, usage } = await chatCompletion(config, {
          model: opts.model,
          messages: [{ role: "user", content: opts.prompt }],
          response_format: { type: "json_schema", json_schema: opts.jsonSchema },
        });

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(content);
        } catch {
          throw new ProviderError(`${config.id}'s response was not valid JSON.`, "invalid_response");
        }

        return { data: parsedJson, usage: { ...usage, imageCount: 0 } };
      },
    },
    vision: {
      async parseMenu(image: ImageRef, opts) {
        const res = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: opts.model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: buildPrompt(opts.hints) },
                  {
                    type: "image_url",
                    image_url: { url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}` },
                  },
                ],
              },
            ],
            response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
          }),
        });

        if (res.status === 401 || res.status === 403) {
          throw new ProviderError(`${config.id} API key was rejected.`, "auth_invalid");
        }
        if (res.status === 429) {
          throw new ProviderError(`${config.id} rate limit hit — try again shortly.`, "rate_limited");
        }
        if (!res.ok) {
          throw new ProviderError(`${config.id} request failed (${res.status}): ${await res.text()}`, "transient");
        }

        const data = await res.json();
        const choice = data.choices?.[0];
        if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) {
          throw new ProviderError(`${config.id} declined to process this image.`, "content_refused");
        }

        const text = choice?.message?.content;
        if (typeof text !== "string") {
          throw new ProviderError(`${config.id} returned no parseable content.`, "invalid_response");
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(text);
        } catch {
          throw new ProviderError(`${config.id}'s response was not valid JSON.`, "invalid_response");
        }

        const parsed = parsedMenuSchema.safeParse(parsedJson);
        if (!parsed.success) {
          throw new ProviderError(
            `${config.id}'s response didn't match the expected menu shape: ${parsed.error.message}`,
            "invalid_response"
          );
        }

        const usage = data.usage ?? {};
        return {
          menu: parsed.data,
          usage: estimateCost(opts.model, config.models, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0),
        };
      },

      async extractJson(image: ImageRef, opts) {
        const res = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: opts.model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: opts.prompt },
                  {
                    type: "image_url",
                    image_url: { url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}` },
                  },
                ],
              },
            ],
            response_format: { type: "json_schema", json_schema: opts.jsonSchema },
          }),
        });

        if (res.status === 401 || res.status === 403) {
          throw new ProviderError(`${config.id} API key was rejected.`, "auth_invalid");
        }
        if (res.status === 429) {
          throw new ProviderError(`${config.id} rate limit hit — try again shortly.`, "rate_limited");
        }
        if (!res.ok) {
          throw new ProviderError(`${config.id} request failed (${res.status}): ${await res.text()}`, "transient");
        }

        const data = await res.json();
        const choice = data.choices?.[0];
        if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) {
          throw new ProviderError(`${config.id} declined to process this image.`, "content_refused");
        }

        const content = choice?.message?.content;
        if (typeof content !== "string") {
          throw new ProviderError(`${config.id} returned no parseable content.`, "invalid_response");
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(content);
        } catch {
          throw new ProviderError(`${config.id}'s response was not valid JSON.`, "invalid_response");
        }

        const usage = data.usage ?? {};
        return {
          data: parsedJson,
          usage: estimateCost(opts.model, config.models, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0),
        };
      },
    },
  };
}
