import { resolveTask } from "@/lib/providers/registry";
import { recordUsage } from "@/lib/providers/usage";
import { ProviderError } from "@/lib/providers/types";
import { fixConjunctionSpacing } from "@/lib/i18n/normalize-translation";
import {
  buildTranslationPrompt,
  translationBatchResponseSchema,
  TRANSLATION_JSON_SCHEMA,
  type TranslationUnitInput,
  type TranslationUnitOutput,
} from "./translate-schema";

// Kept small and chunked (rather than one call for the whole menu) so a
// ~200-item menu can't blow past a single response's output-token budget —
// each batch is independently sized to comfortably fit, and batches run in
// parallel so overall latency stays close to one batch's latency, not the sum.
const BATCH_SIZE = 40;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

/**
 * Translates a flat list of {id, name, description} units (section and item
 * text mixed together — see translate-schema.ts) to Spanish, via the
 * translate_menu provider task (docs/05/docs/06). Returns a map keyed by the
 * same ids the caller passed in, so the Main Menu editor can merge results
 * back into the right section/item regardless of DB round-trip or ordering.
 * Never persists anything — the editor shows the result for owner review
 * before a normal Save writes it via replace_main_menu().
 */
export async function translateMainMenuUnits(
  restaurantId: string,
  units: TranslationUnitInput[]
): Promise<Map<string, TranslationUnitOutput>> {
  const { adapter, model } = await resolveTask(restaurantId, "translate_menu");
  if (!adapter.text?.generateJson) {
    throw new ProviderError(`${adapter.id} doesn't support structured translation.`, "transient");
  }

  const batches = chunk(units, BATCH_SIZE);
  const results = new Map<string, TranslationUnitOutput>();

  await Promise.all(
    batches.map(async (batch) => {
      const { data, usage } = await adapter.text!.generateJson!({
        model,
        prompt: buildTranslationPrompt(batch),
        jsonSchema: TRANSLATION_JSON_SCHEMA,
      });

      await recordUsage(restaurantId, adapter.id, model, "translate_menu", usage);

      const parsed = translationBatchResponseSchema.safeParse(data);
      if (!parsed.success) {
        throw new ProviderError(`Translation response didn't match the expected shape: ${parsed.error.message}`, "invalid_response");
      }

      for (const unit of parsed.data.translations) {
        // fixConjunctionSpacing: repair the model's occasional glued-conjunction
        // artifact ("Pollo yÑoquis") before the owner ever sees the text.
        results.set(unit.id, {
          ...unit,
          name: fixConjunctionSpacing(unit.name),
          description: unit.description ? fixConjunctionSpacing(unit.description) : unit.description,
        });
      }
    })
  );

  return results;
}
