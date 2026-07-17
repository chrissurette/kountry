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
  // The dialect and glossary here were set after a native Latino reviewer
  // found the first (unconstrained) translation pass confusing — a full
  // hand-curated redo happened 2026-07-16 (CLAUDE.md's menu-Spanish notes,
  // docs/08's "Machine-translation quality"). New menu items translated by
  // this prompt must land in the same register and vocabulary as that pass.
  return [
    "Translate the following US restaurant menu text from English to natural, appetizing",
    "LATIN AMERICAN Spanish — Cuban / Puerto Rican / South American, NOT Mexican and NOT",
    "European Spanish — as it would read on a bilingual diner menu in Florida.",
    "",
    "Fixed glossary (always use exactly these):",
    "- bacon = tocineta (never tocino/beicon) · pork = puerco · peanut = maní",
    "- green beans = habichuelas tiernas · beets = remolachas · peach = melocotón",
    "- eggs any style = al gusto; scrambled = revueltos; sunny side up = fritos;",
    "  over-easy/-medium/-hard = fritos por ambos lados con yema blanda / media / dura (never volteados/virados)",
    "- sausage patty = tortita de salchicha · sausage link = salchicha",
    "- grilled (diner flat-top) = a la plancha · choose = escoger · add = agregar (never añadir)",
    "- \"& Fries\" = \"con Papas Fritas\" · sweet potato = batata",
    "Keep these iconic US menu words in English, untranslated (customers order by these names):",
    "grits, hash browns, biscuit (NEVER galleta or bizcocho), gravy, waffle (never gofre),",
    "bagel, sub, wrap, club, BLT, Grilled Cheese, Patty Melt, Philly Cheese Steak, Hot Dog,",
    "Corned Beef Hash, Texas Toast. home fries = papas caseras; toast = pan tostado.",
    "",
    "Rules:",
    "- Return one entry per input id, with that exact same id, in the translations array.",
    "- Translate `name` and `description`. If `description` is null, return description as null — never invent one.",
    "- Impersonal register (\"Se sirve con…\") — no tú or usted forms in descriptions.",
    "- Lists must keep EXACTLY as many options as the English — never merge or drop an item from",
    "  an enumeration (a list of 5 egg styles must come back as 5).",
    "- Do not translate or alter numbers, prices, or abbreviations like \"MP\".",
    "- Preserve every \" · \" separator exactly where the English has one — same count, same placement.",
    "- Keep translations concise — menu copy, not full sentences where the English wasn't either.",
    '- Use normal word spacing — never run words together (write "Pollo y Ñoquis", never "Pollo yÑoquis").',
    "",
    "Input (JSON):",
    JSON.stringify(units),
  ].join("\n");
}
