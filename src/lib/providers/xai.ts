import { createOpenAiCompatibleAdapter } from "./openai-compatible";
import type { ModelInfo, ProviderAdapter } from "./types";

// xAI's API is deliberately OpenAI-wire-compatible (same /chat/completions
// shape, same json_schema structured outputs), so it reuses
// openai-compatible.ts entirely — only the base URL and model catalog
// differ. Rough per-1M-token estimates for cost metering, same caveat as
// gemini.ts/openai.ts: update as xAI's published pricing changes.
const MODELS: ModelInfo[] = [{ id: "grok-4", label: "Grok 4", pricing: { inputPerMTokUsd: 3, outputPerMTokUsd: 15 } }];

export function createXaiAdapter(apiKey: string): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    id: "xai",
    baseUrl: "https://api.x.ai/v1",
    models: MODELS,
    apiKey,
  });
}
