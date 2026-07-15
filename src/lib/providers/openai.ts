import { createOpenAiCompatibleAdapter } from "./openai-compatible";
import { ProviderError, type ModelInfo, type ProviderAdapter, type Usage } from "./types";

// Rough per-1M-token estimates for cost metering — see the same caveat in
// gemini.ts. Update as OpenAI's published pricing changes.
const CHAT_MODELS: ModelInfo[] = [
  { id: "gpt-4o", label: "GPT-4o", pricing: { inputPerMTokUsd: 2.5, outputPerMTokUsd: 10 } },
  { id: "gpt-4o-mini", label: "GPT-4o mini", pricing: { inputPerMTokUsd: 0.15, outputPerMTokUsd: 0.6 } },
];

// gpt-image-1 bills per image, varying by quality/size — this is a
// directional estimate at "high" quality, 1024x1024 (our fixed defaults
// below, bumped from "medium" for text fidelity — docs/08), just for the
// Settings usage dashboard; not billing-accurate.
const IMAGE_MODELS: ModelInfo[] = [{ id: "gpt-image-1", label: "GPT Image 1", pricing: { perImageUsd: 0.19 } }];

/**
 * OpenAI is the first imageGen adapter (docs/05: "OpenAI ✅ (gpt-image-1,
 * multi-image input)") — used by the Daily Specials pipeline to redraw a
 * handwritten menu photo into a styled image (src/lib/menu/generate-image-service.ts).
 * Wraps the shared OpenAI-compatible base (vision/chat) rather than folding
 * imageGen into that shared function, since xAI reuses the same base for
 * vision but doesn't get image_gen (docs/05).
 */
export function createOpenAiAdapter(apiKey: string): ProviderAdapter {
  const base = createOpenAiCompatibleAdapter({
    id: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: CHAT_MODELS,
    apiKey,
  });

  return {
    ...base,
    capabilities: new Set([...base.capabilities, "image_gen"]),
    models: (cap) => (cap === "image_gen" ? IMAGE_MODELS : base.models(cap)),
    imageGen: {
      async generate(opts) {
        const form = new FormData();
        form.append("model", opts.model);
        form.append("prompt", opts.prompt);
        form.append("size", opts.size ?? "1024x1024");
        // "high" over the previous "medium" default — text fidelity on a
        // dense handwritten board (docs/08) is worth the extra per-image
        // cost; see IMAGE_MODELS' pricing note below and the Settings usage
        // dashboard for the actual per-generation cost this produces.
        form.append("quality", "high");

        const inputImage = opts.inputImages?.[0];
        if (inputImage) {
          const ext = inputImage.mimeType.split("/")[1] ?? "png";
          // TS's DOM lib types Uint8Array.buffer as ArrayBufferLike (could be
          // SharedArrayBuffer), stricter than BlobPart's ArrayBufferView<ArrayBuffer> —
          // harmless at runtime, Uint8Array is always a valid BlobPart.
          form.append("image", new Blob([inputImage.bytes as unknown as BlobPart], { type: inputImage.mimeType }), `input.${ext}`);
        }

        // /images/edits requires an input image; /images/generations is
        // text-to-image only. Our use case always supplies the source photo.
        const endpoint = inputImage ? "images/edits" : "images/generations";
        const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}` },
          body: form,
        });

        if (res.status === 401 || res.status === 403) {
          throw new ProviderError("OpenAI API key was rejected.", "auth_invalid");
        }
        if (res.status === 429) {
          throw new ProviderError("OpenAI rate limit hit — try again shortly.", "rate_limited");
        }
        if (!res.ok) {
          throw new ProviderError(`OpenAI image request failed (${res.status}): ${await res.text()}`, "transient");
        }

        const data = await res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (typeof b64 !== "string") {
          throw new ProviderError("OpenAI returned no image data.", "invalid_response");
        }

        const info = IMAGE_MODELS.find((m) => m.id === opts.model);
        const usage: Usage = { inputTokens: 0, outputTokens: 0, imageCount: 1, estCostUsd: info?.pricing.perImageUsd ?? 0 };

        return { image: { bytes: Buffer.from(b64, "base64"), mimeType: "image/png" }, usage };
      },
    },
  };
}
