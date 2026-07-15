import { z } from "zod";

/**
 * Request/response shape for the Main Menu Spanish translation action
 * (src/lib/main-menu/translate-service.ts). One flat list of translatable
 * units — a unit is a section's or an item's name+description, keyed by the
 * client's own `id` (a real DB id for existing rows, a fresh client-generated
 * one for rows added but not yet saved) so results map back safely even if
 * a response is truncated or the model doesn't preserve array order exactly.
 */

export const translationUnitInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const translateMainMenuRequestSchema = z.object({
  units: z.array(translationUnitInputSchema).min(1).max(1000),
});

export type TranslationUnitInput = z.infer<typeof translationUnitInputSchema>;
export type TranslateMainMenuRequest = z.infer<typeof translateMainMenuRequestSchema>;

const translationUnitOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const translationBatchResponseSchema = z.object({
  translations: z.array(translationUnitOutputSchema),
});

export type TranslationUnitOutput = z.infer<typeof translationUnitOutputSchema>;

/** OpenAI Structured Outputs (strict json_schema) for one translation batch. */
export const TRANSLATION_JSON_SCHEMA = {
  name: "menu_translations",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      translations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: ["string", "null"] },
          },
          required: ["id", "name", "description"],
        },
      },
    },
    required: ["translations"],
  },
} as const;

export function buildTranslationPrompt(units: TranslationUnitInput[]): string {
  return [
    "Translate the following US restaurant menu text from English to natural, appetizing Spanish",
    "as it would read on a menu in a Spanish-speaking restaurant in the United States.",
    "",
    "Rules:",
    "- Return one entry per input id, with that exact same id, in the translations array.",
    "- Translate `name` and `description`. If `description` is null, return description as null — never invent one.",
    "- Keep proper nouns, brand names, and dish names that are already commonly used in English as-is",
    '  (e.g. keep "Philly" in a dish name) unless a Spanish name is clearly more natural.',
    "- Do not translate or alter numbers, prices, or abbreviations like \"MP\".",
    "- Keep translations concise — menu copy, not full sentences where the English wasn't either.",
    '- Use normal word spacing — never run words together (write "Pollo y Ñoquis", never "Pollo yÑoquis").',
    "",
    "Input (JSON):",
    JSON.stringify(units),
  ].join("\n");
}
