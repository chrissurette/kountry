import { resolveTask } from "@/lib/providers/registry";
import { recordUsage } from "@/lib/providers/usage";
import { ProviderError } from "@/lib/providers/types";
import { fixConjunctionSpacing } from "@/lib/i18n/normalize-translation";
import type { DailySpecialMenu } from "./special-menu-schema";
import {
  extractTranslatableUnits,
  applyTranslations,
  buildSpecialTranslationPrompt,
  specialTranslationResponseSchema,
  SPECIAL_TRANSLATION_JSON_SCHEMA,
} from "./translate-special-schema";

/**
 * Translates a Daily Special's customer-facing text to Spanish in a single
 * call — one day's board is small (a handful to a few dozen strings), unlike
 * the ~200-item Main Menu translation which needs chunked batches
 * (src/lib/main-menu/translate-service.ts). Returns a complete, ready-to-
 * render DailySpecialMenu; never persists anything itself — the Review
 * screen shows the result for the owner to confirm/edit before "Save &
 * render" writes it (docs/08).
 */
export async function translateSpecialMenu(restaurantId: string, menu: DailySpecialMenu): Promise<DailySpecialMenu> {
  const units = extractTranslatableUnits(menu);
  if (units.length === 0) return menu;

  const { adapter, model } = await resolveTask(restaurantId, "translate_menu");
  if (!adapter.text?.generateJson) {
    throw new ProviderError(`${adapter.id} doesn't support structured translation.`, "transient");
  }

  const { data, usage } = await adapter.text.generateJson({
    model,
    prompt: buildSpecialTranslationPrompt(units),
    jsonSchema: SPECIAL_TRANSLATION_JSON_SCHEMA,
  });

  await recordUsage(restaurantId, adapter.id, model, "translate_menu", usage);

  const parsed = specialTranslationResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ProviderError(`Translation response didn't match the expected shape: ${parsed.error.message}`, "invalid_response");
  }

  // fixConjunctionSpacing: repair the model's occasional glued-conjunction
  // artifact ("Pollo yÑoquis") before the owner ever sees the text.
  const translations = new Map(parsed.data.translations.map((t) => [t.id, fixConjunctionSpacing(t.text)]));
  return applyTranslations(menu, translations);
}
