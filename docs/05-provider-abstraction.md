# 05 — AI Provider Abstraction

Three capability interfaces, one registry, one adapter per vendor. Feature code is written against **capabilities**; vendors are **configuration**. No feature code may call a vendor SDK directly.

## Capability interfaces

```ts
interface VisionParseProvider {
  parseMenu(image: ImageRef, opts: { model: string; hints?: RestaurantHints })
    : Promise<{ menu: ParsedMenu; confidence: FieldConfidence; usage: Usage }>;
}

interface TextProvider {
  // copywriting: polish descriptions, tone-match to brand voice
  generate(prompt: string, opts: { model: string }): Promise<{ text: string; usage: Usage }>;
  // Text-only counterpart to VisionParseProvider.extractJson — same strict
  // json_schema structured-output mechanism, no image. Backs Main Menu
  // Spanish translation (translate_menu task). Optional for the same reason
  // extractJson is: only adapters whose endpoint supports json_schema mode
  // implement it.
  generateJson?(opts: { model: string; prompt: string; jsonSchema: object }): Promise<{ data: unknown; usage: Usage }>;
}

interface ImageGenProvider {
  generate(opts: {
    model: string;
    prompt: string;
    inputImages?: ImageRef[];   // [handwritten menu photo, style reference] for the AI export path
    size: ImageSize;
  }): Promise<{ image: ImageRef; usage: Usage }>;
}

interface ProviderAdapter {
  id: 'gemini' | 'openai' | 'xai';
  capabilities: Set<'vision' | 'text' | 'image_gen'>;
  models(cap: Capability): ModelInfo[];   // includes per-token/per-image pricing for metering
  vision?: VisionParseProvider;
  text?: TextProvider;
  imageGen?: ImageGenProvider;
}
```

## Layer behaviors (all server-side)

- **Resolution:** a task runs as `resolveTask(restaurantId, 'image_gen')` (`src/lib/providers/registry.ts`) — looks up `provider_task_config`, decrypts the key from Vault **inside the request handler**, never logs, caches in memory only for the request, never returns it. Keys never reach the client under any circumstance.
- **Structured output (vision):** the vision capability has two structured-output methods. `parseMenu` (legacy, unused) returns the fixed `ParsedMenu` shape. **`extractJson`** (added 2026-07-16) is generic: feature code passes its own prompt + JSON schema and gets back validated JSON — this backs the Daily Special extract-and-render pipeline (docs/08), which resolves the `ocr_parse` task to OpenAI `gpt-4o` and hands it the `DailySpecialMenu` schema (`src/lib/menu/special-menu-schema.ts`). The app then renders the menu deterministically as SVG; the model only reads/organizes, never draws readable text.
- **Structured output (text) — added 2026-07-15:** `TextProvider.generateJson` is the same mechanism as `extractJson` minus the image — feature code supplies a prompt (with its input data serialized into it) + JSON schema, gets back validated JSON. Backs the Main Menu Spanish translation action (`translate_menu` task, `src/lib/main-menu/translate-service.ts`): a flat list of `{id, name, description}` units (section and item text mixed together, `id` = the client's own row key) is translated in parallel batches of 40 — kept small and chunked rather than one call for the whole menu, so a ~200-item menu can't blow past a single response's output-token budget. Before this, `TextProvider` was interface-only — defined but never implemented by any adapter, despite the coverage table below previously (inaccurately) claiming "text ✅" for all three vendors.
- **Metering:** every adapter call returns `Usage`; a wrapper writes a `provider_usage` row with estimated cost from the model's price table. Surfaced in the Settings usage dashboard.
- **Error normalization:** adapters map vendor errors to a common taxonomy (`auth_invalid` → flips credential `status`, `rate_limited` → retry-after surfaced to UI, `content_refused`, `transient`).

> Comparison mode (`ComparisonRunner` fanning one input to N `{provider, model}` pairs with a field-level diff) was built for OCR A/B in Phase 2 and removed 2026-07-15 along with the rest of the OCR-to-text pipeline (docs/07's note). The registry/adapter abstraction itself doesn't preclude rebuilding something like it for `image_gen` later if useful — nothing about `resolveTask`/`buildAdapter` is comparison-mode-specific.

## Adding a vendor

One adapter file + a registry entry + pricing rows in `ModelInfo`. Nothing else changes — no feature code, no schema, no UI beyond the model picker auto-populating.

## Current coverage (updated 2026-07-15)

| Vendor | vision | text | image_gen | Notes |
|---|---|---|---|---|
| Gemini | ✅ | interface only | — | `vision` unused since OCR-parse was retired as a feature; kept as working infrastructure. `text` (`generate`/`generateJson`) is declared on the interface but not implemented by `gemini.ts` — Gemini isn't in `translate_menu`'s path today. Straightforward to add later (Gemini's REST API supports `responseSchema` the same way its `vision.parseMenu` already uses, docs shown above) if a second translation provider is ever wanted. |
| OpenAI | ✅ | ✅ (`generate` + `generateJson`) | ✅ (`gpt-image-1` via `/v1/images/edits`) | The only `imageGen` adapter — powers the Daily Specials image pipeline (docs/03), default task config. Also the default for `translate_menu` (`gpt-4o-mini`) — Main Menu Spanish translation (docs/03, docs/06). |
| xAI | ✅ | ✅ (`generate` + `generateJson`) | — | `vision`/`text` both implemented via the shared `openai-compatible.ts` base (same as OpenAI), no `imageGen` adapter built. Not currently selected as a default for any task. |

Adding `imageGen` support for Gemini or xAI is exactly the "one adapter method + nothing else changes" case above — `src/lib/providers/openai.ts` is the reference implementation.
