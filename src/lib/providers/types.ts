import { z } from "zod";
import type { ProviderId, ProviderTask } from "@/types/database";

/**
 * Shared capability interfaces (docs/05-provider-abstraction.md). Feature
 * code is written against these, never against a vendor SDK directly —
 * adding a vendor means one adapter file + a registry entry, nothing else.
 */

export const parsedMenuItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().nullable().optional(),
  price_note: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const parsedMenuSectionSchema = z.object({
  name: z.string(),
  items: z.array(parsedMenuItemSchema),
});

export const parsedMenuSchema = z.object({
  sections: z.array(parsedMenuSectionSchema),
});

export type ParsedMenuItem = z.infer<typeof parsedMenuItemSchema>;
export type ParsedMenuSection = z.infer<typeof parsedMenuSectionSchema>;
export type ParsedMenu = z.infer<typeof parsedMenuSchema>;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  estCostUsd: number;
}

export interface ImageRef {
  bytes: Uint8Array;
  mimeType: string;
}

export interface RestaurantHints {
  currency?: string;
  knownSectionNames?: string[];
}

export interface VisionParseProvider {
  parseMenu(
    image: ImageRef,
    opts: { model: string; hints?: RestaurantHints }
  ): Promise<{ menu: ParsedMenu; usage: Usage }>;
  /**
   * Generic vision → validated-JSON extraction using the vendor's structured
   * output / json_schema mode. Feature code supplies its own prompt + JSON
   * schema and re-validates the returned `data` (a plain object) with its own
   * Zod schema. Optional — only adapters whose endpoint supports strict
   * json_schema (OpenAI, xAI) implement it; the Daily Special extraction path
   * (src/lib/menu/parse-special-menu-service.ts) depends on it.
   */
  extractJson?(
    image: ImageRef,
    opts: { model: string; prompt: string; jsonSchema: object }
  ): Promise<{ data: unknown; usage: Usage }>;
}

export interface TextProvider {
  generate(prompt: string, opts: { model: string }): Promise<{ text: string; usage: Usage }>;
  /**
   * Text-only counterpart to VisionParseProvider.extractJson — same
   * strict json_schema structured-output mechanism, no image input. Backs
   * the Main Menu Spanish translation action
   * (src/lib/main-menu/translate-service.ts). Optional for the same reason
   * extractJson is: only adapters whose endpoint supports strict
   * json_schema mode implement it.
   */
  generateJson?(opts: { model: string; prompt: string; jsonSchema: object }): Promise<{ data: unknown; usage: Usage }>;
}

export interface ImageGenProvider {
  generate(opts: {
    model: string;
    prompt: string;
    inputImages?: ImageRef[];
    size?: string;
  }): Promise<{ image: ImageRef; usage: Usage }>;
}

export type Capability = "vision" | "text" | "image_gen";

export interface ModelInfo {
  id: string;
  label: string;
  /** USD per 1M tokens (input/output) or per image, whichever applies to the model. */
  pricing: { inputPerMTokUsd?: number; outputPerMTokUsd?: number; perImageUsd?: number };
}

export interface ProviderAdapter {
  id: ProviderId;
  capabilities: Set<Capability>;
  models(cap: Capability): ModelInfo[];
  vision?: VisionParseProvider;
  text?: TextProvider;
  imageGen?: ImageGenProvider;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "auth_invalid" | "rate_limited" | "content_refused" | "transient" | "invalid_response"
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Every ocr_parse/copywriting/image_gen call must go through resolveTask — never call an adapter directly. */
export interface TaskResolution {
  adapter: ProviderAdapter;
  model: string;
  restaurantId: string;
}

export type { ProviderId, ProviderTask };
