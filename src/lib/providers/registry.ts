import { createAdminClient } from "@/lib/supabase/admin";
import { decryptProviderKey } from "./crypto";
import { createGeminiAdapter } from "./gemini";
import { createOpenAiAdapter } from "./openai";
import { createXaiAdapter } from "./xai";
import { ProviderError, type Capability, type ProviderAdapter, type ProviderId, type ProviderTask, type TaskResolution } from "./types";

/** Sensible defaults so a task works before the owner has visited Settings to pick a model. */
const DEFAULT_MODEL: Record<ProviderTask, { provider: ProviderId; model: string }> = {
  // Daily Special structured extraction (2026-07-16 refactor) resolves this
  // task — OpenAI gpt-4o (vision + strict json_schema structured output) is
  // the default since OpenAI is the only configured provider, and its vision
  // adapter implements extractJson (openai-compatible.ts).
  ocr_parse: { provider: "openai", model: "gpt-4o" },
  copywriting: { provider: "gemini", model: "gemini-2.5-flash" },
  // gpt-image-1 image generation is the legacy Daily Specials renderer, kept
  // only so old PNG-based snapshots still resolve. New specials render as SVG
  // deterministically (src/lib/menu/render-special-menu-svg.ts).
  image_gen: { provider: "openai", model: "gpt-image-1" },
  // Main Menu Spanish translation (src/lib/main-menu/translate-service.ts) —
  // OpenAI since that's the only adapter with generateJson wired up so far
  // (openai-compatible.ts, shared with xAI); gpt-4o-mini is plenty for
  // translating short menu item names/descriptions and keeps the per-run
  // cost low on a ~200-item menu.
  translate_menu: { provider: "openai", model: "gpt-4o-mini" },
};

const REQUIRED_CAPABILITY: Record<ProviderTask, Capability> = {
  ocr_parse: "vision",
  copywriting: "text",
  image_gen: "image_gen",
  translate_menu: "text",
};

/** The only place a vendor adapter gets instantiated — every caller goes through resolveTask() or resolveProviderDirect() below, never this directly. */
export function buildAdapter(provider: ProviderId, apiKey: string): ProviderAdapter {
  switch (provider) {
    case "gemini":
      return createGeminiAdapter(apiKey);
    case "openai":
      return createOpenAiAdapter(apiKey);
    case "xai":
      return createXaiAdapter(apiKey);
  }
}

async function getCredential(restaurantId: string, provider: ProviderId) {
  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("provider_credentials")
    .select("encrypted_key, status")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .maybeSingle();

  if (!credential) {
    throw new ProviderError(`No ${provider} API key is configured. Add one in Settings → AI Providers.`, "auth_invalid");
  }
  if (credential.status === "invalid") {
    throw new ProviderError(`The stored ${provider} API key was previously rejected — update it in Settings.`, "auth_invalid");
  }
  return credential;
}

/**
 * Resolves a task ('ocr_parse' etc.) to a configured, ready-to-call adapter
 * for the given restaurant, using the owner's saved per-task provider/model
 * choice (falling back to a sensible default). This is the path every
 * normal feature call uses — never construct an adapter directly (docs/05).
 */
export async function resolveTask(restaurantId: string, task: ProviderTask): Promise<TaskResolution> {
  const admin = createAdminClient();

  const { data: taskConfig } = await admin
    .from("provider_task_config")
    .select("provider, model")
    .eq("restaurant_id", restaurantId)
    .eq("task", task)
    .maybeSingle();

  const provider = (taskConfig?.provider as ProviderId | undefined) ?? DEFAULT_MODEL[task].provider;
  const model = taskConfig?.model ?? DEFAULT_MODEL[task].model;

  const credential = await getCredential(restaurantId, provider);
  const adapter = buildAdapter(provider, decryptProviderKey(credential.encrypted_key));

  const requiredCapability = REQUIRED_CAPABILITY[task];
  if (!adapter.capabilities.has(requiredCapability)) {
    throw new ProviderError(`${provider} doesn't support the ${requiredCapability} capability needed for ${task}.`, "transient");
  }

  return { adapter, model, restaurantId };
}

/**
 * Resolves a SPECIFIC provider (bypassing the saved task-config) using the
 * restaurant's stored key for it. Used by comparison mode (docs/05: "run
 * OCR/parse on two models and compare"), where the caller picks the exact
 * {provider, model} pairs to run rather than relying on the default.
 */
export async function resolveProviderDirect(restaurantId: string, provider: ProviderId): Promise<ProviderAdapter> {
  const credential = await getCredential(restaurantId, provider);
  return buildAdapter(provider, decryptProviderKey(credential.encrypted_key));
}
