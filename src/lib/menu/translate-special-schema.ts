import { z } from "zod";
import type { DailySpecialMenu } from "./special-menu-schema";

/**
 * Translation units for a single Daily Special (docs/08's proposed design,
 * now built). Unlike Main Menu's translation (src/lib/main-menu/translate-schema.ts,
 * ~200 items needing id-keyed chunked batches), one day's board is small —
 * a single generateJson call covers the whole thing, so units are keyed by a
 * plain dot/bracket-free path string rather than a DB row id.
 *
 * Deliberately excluded from translation: `restaurantName`, `address`,
 * `phone` (standardized from the restaurant profile at parse/render time —
 * facts, identical on both language renders), every price field, and
 * `uncertainItems` (internal QA notes for the owner reviewing the English
 * extraction — never rendered, so translating them would be pointless).
 * `dessertsLabel`, `additionalSections` titles/notes/items, soup names and
 * soup tier labels ("Cup"/"Bowl"/"Small"), and `dateLabel` ("Happy Monday")
 * ARE translated — all customer-facing copy. `dateText` is translated only
 * when it contains written English month/day names; numeric dates stay as-is.
 */
export interface TranslatableUnit {
  id: string;
  text: string;
}

export function extractTranslatableUnits(menu: DailySpecialMenu): TranslatableUnit[] {
  const units: TranslatableUnit[] = [];
  const push = (id: string, text: string | null | undefined) => {
    if (text && text.trim()) units.push({ id, text });
  };

  push("title", menu.title);
  push("subtitle", menu.subtitle);
  // dateLabel ("Happy Monday") is a greeting shown in the letterhead → translate.
  push("dateLabel", menu.dateLabel);
  // The extractor may return a numeric date or a written month/day. Only the
  // latter needs a translation unit.
  if (menu.dateText && /[A-Za-z]/.test(menu.dateText)) push("dateText", menu.dateText);
  menu.entrees.forEach((e, i) => {
    push(`entrees.${i}.name`, e.name);
    push(`entrees.${i}.description`, e.description);
  });
  menu.featured.forEach((f, i) => {
    push(`featured.${i}.name`, f.name);
    push(`featured.${i}.description`, f.description);
  });
  menu.soups.forEach((s, i) => {
    push(`soups.${i}.name`, s.name);
    s.tiers.forEach((t, j) => push(`soups.${i}.tiers.${j}.label`, t.label));
  });
  menu.combos.forEach((c, i) => push(`combos.${i}.name`, c.name));
  if (menu.veggiePlate) {
    push("veggiePlate.description", menu.veggiePlate.description);
  }
  push("dessertsLabel", menu.dessertsLabel);
  menu.desserts.forEach((d, i) => push(`desserts.${i}.name`, d.name));
  menu.sides.forEach((s, i) => push(`sides.${i}`, s));
  menu.additionalSections.forEach((sec, i) => {
    push(`additionalSections.${i}.title`, sec.title);
    push(`additionalSections.${i}.note`, sec.note);
    sec.items.forEach((it, j) => {
      push(`additionalSections.${i}.items.${j}.name`, it.name);
      push(`additionalSections.${i}.items.${j}.description`, it.description);
    });
  });

  return units;
}

/** Applies {id, text} translations onto a clone of the English menu — anything without a matching (non-empty) translation keeps its original English text, never blanked. */
export function applyTranslations(menu: DailySpecialMenu, translations: Map<string, string>): DailySpecialMenu {
  const next = structuredClone(menu);
  const get = (id: string) => translations.get(id)?.trim() || null;

  next.title = get("title") ?? next.title;
  if (next.subtitle) next.subtitle = get("subtitle") ?? next.subtitle;
  if (next.dateLabel) next.dateLabel = get("dateLabel") ?? next.dateLabel;
  if (next.dateText) next.dateText = localizeEnglishDateWords(get("dateText") ?? next.dateText);

  next.entrees.forEach((e, i) => {
    e.name = get(`entrees.${i}.name`) ?? e.name;
    if (e.description) e.description = get(`entrees.${i}.description`) ?? e.description;
  });

  next.featured.forEach((f, i) => {
    if (f.name) f.name = get(`featured.${i}.name`) ?? f.name;
    if (f.description) f.description = get(`featured.${i}.description`) ?? f.description;
  });

  next.soups.forEach((s, i) => {
    if (s.name) s.name = get(`soups.${i}.name`) ?? s.name;
    s.tiers.forEach((t, j) => {
      if (t.label) t.label = fixedSoupSizeTranslation(t.label) ?? get(`soups.${i}.tiers.${j}.label`) ?? t.label;
    });
  });

  next.combos.forEach((c, i) => {
    c.name = get(`combos.${i}.name`) ?? c.name;
  });

  if (next.veggiePlate?.description) {
    next.veggiePlate.description = get("veggiePlate.description") ?? next.veggiePlate.description;
  }

  if (next.dessertsLabel) next.dessertsLabel = get("dessertsLabel") ?? next.dessertsLabel;

  next.desserts.forEach((d, i) => {
    d.name = get(`desserts.${i}.name`) ?? d.name;
  });

  next.sides.forEach((s, i) => {
    next.sides[i] = get(`sides.${i}`) ?? s;
  });

  next.additionalSections.forEach((sec, i) => {
    sec.title = get(`additionalSections.${i}.title`) ?? sec.title;
    if (sec.note) sec.note = get(`additionalSections.${i}.note`) ?? sec.note;
    sec.items.forEach((it, j) => {
      it.name = get(`additionalSections.${i}.items.${j}.name`) ?? it.name;
      if (it.description) it.description = get(`additionalSections.${i}.items.${j}.description`) ?? it.description;
    });
  });

  return next;
}

const SOUP_SIZE_ES: Record<string, string> = {
  cup: "Taza",
  bowl: "Tazón",
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
};

function fixedSoupSizeTranslation(label: string): string | null {
  return SOUP_SIZE_ES[label.trim().toLowerCase()] ?? null;
}

const ENGLISH_DATE_WORDS: Record<string, string> = {
  january: "enero",
  february: "febrero",
  march: "marzo",
  april: "abril",
  may: "mayo",
  june: "junio",
  july: "julio",
  august: "agosto",
  september: "septiembre",
  october: "octubre",
  november: "noviembre",
  december: "diciembre",
  monday: "lunes",
  tuesday: "martes",
  wednesday: "miércoles",
  thursday: "jueves",
  friday: "viernes",
  saturday: "sábado",
  sunday: "domingo",
};

function localizeEnglishDateWords(text: string): string {
  return text.replace(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    (word) => {
      const translated = ENGLISH_DATE_WORDS[word.toLowerCase()];
      return word === word.toUpperCase() ? translated.toUpperCase() : translated;
    },
  );
}

/** OpenAI Structured Outputs (strict json_schema) for one translation call. */
export const SPECIAL_TRANSLATION_JSON_SCHEMA = {
  name: "special_menu_translations",
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
            text: { type: "string" },
          },
          required: ["id", "text"],
        },
      },
    },
    required: ["translations"],
  },
} as const;

export const specialTranslationResponseSchema = z.object({
  translations: z.array(z.object({ id: z.string(), text: z.string() })),
});

export function buildSpecialTranslationPrompt(units: TranslatableUnit[]): string {
  // Same dialect + glossary as Main Menu's buildTranslationPrompt
  // (src/lib/main-menu/translate-schema.ts) — set 2026-07-16 after a native
  // Latino reviewer found the unconstrained pass confusing. Keep the two in sync.
  return [
    "Translate the following restaurant daily-specials board text from English to natural,",
    "appetizing LATIN AMERICAN Spanish — Cuban / Puerto Rican / South American, NOT Mexican",
    "and NOT European Spanish — as it would read on a bilingual diner's specials board in Florida.",
    "",
    "Fixed glossary (always use exactly these):",
    "- bacon = tocineta (never tocino/beicon) · pork = puerco · peanut = maní",
    "- green beans = habichuelas tiernas · beets = remolachas · peach = melocotón",
    "- eggs any style = al gusto; scrambled = revueltos; sunny side up = fritos;",
    "  over-easy/-medium/-hard = fritos por ambos lados con yema blanda / media / dura (never volteados/virados)",
    "- sausage patty = tortita de salchicha · sausage link = salchicha",
    "- grilled (diner flat-top) = a la plancha · choose = escoger · add = agregar (never añadir)",
    "Keep these iconic US menu words in English, untranslated: grits, hash browns,",
    "biscuit (NEVER galleta or bizcocho), gravy, waffle (never gofre), bagel, sub, wrap,",
    "BLT, Grilled Cheese, Hot Dog, Corned Beef Hash. home fries = papas caseras;",
    "toast = pan tostado; sweet potato = batata.",
    "",
    "Rules:",
    "- Return one entry per input id, with that exact same id.",
    '- Do not translate or alter numbers, prices, or abbreviations like "MP".',
    "- Translate written month and weekday names in dates; keep numeric-only dates unchanged.",
    "- Soup sizes: Cup = Taza, Bowl = Tazón, Small = Pequeño, Medium = Mediano, Large = Grande.",
    "- Lists must keep EXACTLY as many options as the English — never merge or drop an item",
    "  from an enumeration.",
    "- Keep translations concise — board copy, not full sentences where the English wasn't either.",
    '- Use normal word spacing — never run words together (write "Pollo y Ñoquis", never "Pollo yÑoquis").',
    "",
    "Input (JSON):",
    JSON.stringify(units),
  ].join("\n");
}
