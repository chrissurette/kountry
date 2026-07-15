import { z } from "zod";

/**
 * Structured Daily Special menu — the output of vision extraction
 * (parse-special-menu-service.ts) and the input to the deterministic SVG
 * renderer (render-special-menu-svg.ts). This replaces the old "let
 * gpt-image-1 hand-letter the whole menu" approach (docs/08): AI now only
 * *reads and organizes* the photo into this shape; app code renders the
 * final crisp text, so prices and names come from data, never from generated
 * pixels. Every field is owner-editable on the Review screen before render.
 *
 * Prices are free-text strings WITHOUT a currency symbol (e.g. "12.95",
 * "MP", "12/18") — the renderer adds the "$" prefix for numeric-looking
 * values. Keeping them as strings preserves handwritten oddities like ranges
 * and "market price" without forcing a cents conversion the owner can't
 * easily correct.
 */

const entreeSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const featuredSchema = z.object({
  name: z.string().nullable(),
  description: z.string().nullable(),
  price: z.string().nullable(),
});

/** One labeled price tier for a soup (e.g. {label:"Cup", price:"3.75"}). A single-price soup is one tier with an empty/null label. Replaces the old hardcoded cup/bowl pair so "Small/Large" or any scheme works (2026-07-15 robustness pass). */
const soupTierSchema = z.object({
  label: z.string().nullable(),
  price: z.string().nullable(),
});

const soupSchema = z.object({
  name: z.string().nullable(),
  tiers: z.array(soupTierSchema),
});

const comboSchema = z.object({
  name: z.string(),
  price: z.string().nullable(),
});

const veggiePlateSchema = z.object({
  description: z.string().nullable(),
  price: z.string().nullable(),
});

const dessertSchema = z.object({
  name: z.string(),
  price: z.string().nullable(),
});

/** A generic priced item for the catch-all additionalSections — anything that isn't one of the recognized categories. */
const additionalItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
});

/**
 * The catch-all bucket (2026-07-15 robustness pass): ANY section on the board
 * that doesn't map to the fixed categories (entrées, featured, soup, combos,
 * veggie plate, desserts, sides) — e.g. Breakfast, Appetizers, Kids Menu,
 * Beverages, Wings, Seafood, Family Packs. Prevents silent data loss: instead
 * of the model cramming a novel section into entrées/sides or dropping it, it
 * lands here with the board's own `title` and an optional per-section `note`.
 */
const additionalSectionSchema = z.object({
  title: z.string(),
  note: z.string().nullable(),
  items: z.array(additionalItemSchema),
});

const uncertainItemSchema = z.object({
  section: z.string(),
  rawText: z.string().nullable(),
  issue: z.string(),
  suggestedValue: z.string().nullable(),
});

const baseSpecialMenuSchema = z.object({
  restaurantName: z.string().nullable(),
  dateLabel: z.string().nullable(),
  dateText: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string(),
  subtitle: z.string().nullable(),
  entrees: z.array(entreeSchema),
  /** Now a list — a board can spotlight more than one feature (2026-07-15). */
  featured: z.array(featuredSchema),
  /** Now a list of soups, each with generic labeled price tiers (2026-07-15). Renamed from the old single `soup`; the migration below upgrades legacy data. */
  soups: z.array(soupSchema),
  combos: z.array(comboSchema),
  veggiePlate: veggiePlateSchema.nullable(),
  /** The board's own header for the dessert section, exactly as written (e.g. "Slice of Cake") — the renderer titles the desserts box with this instead of the generic "Desserts" when present. */
  dessertsLabel: z.string().nullable(),
  desserts: z.array(dessertSchema),
  sides: z.array(z.string()),
  /** Catch-all for sections that don't fit the fixed categories — see additionalSectionSchema. */
  additionalSections: z.array(additionalSectionSchema),
  uncertainItems: z.array(uncertainItemSchema),
});

/**
 * Upgrades legacy stored `special_data`/`special_data_es` to the current shape
 * so old drafts and re-published snapshots keep validating and rendering:
 * - `featured` was a single object|null → wrapped in an array.
 * - `soup` (single {name, cupPrice, bowlPrice}) → `soups: [{name, tiers}]`.
 * - `additionalSections`/`dessertsLabel` absent → defaulted.
 * Idempotent: current-shape data (arrays, `soups`, `additionalSections`
 * already present) passes through untouched.
 */
function migrateLegacySpecialData(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const m = { ...(raw as Record<string, unknown>) };

  if (!Array.isArray(m.featured)) m.featured = m.featured ? [m.featured] : [];

  if (m.soups === undefined) {
    const legacy = m.soup as { name?: string | null; cupPrice?: string | null; bowlPrice?: string | null } | null | undefined;
    if (legacy && typeof legacy === "object") {
      const tiers: Array<{ label: string; price: string }> = [];
      if (legacy.cupPrice) tiers.push({ label: "Cup", price: legacy.cupPrice });
      if (legacy.bowlPrice) tiers.push({ label: "Bowl", price: legacy.bowlPrice });
      m.soups = legacy.name || tiers.length ? [{ name: legacy.name ?? null, tiers }] : [];
    } else {
      m.soups = [];
    }
  }
  delete m.soup;

  if (!Array.isArray(m.additionalSections)) m.additionalSections = [];
  if (m.dessertsLabel === undefined) m.dessertsLabel = null;

  return m;
}

export const dailySpecialMenuSchema = z.preprocess(migrateLegacySpecialData, baseSpecialMenuSchema);

export type DailySpecialMenu = z.infer<typeof baseSpecialMenuSchema>;
export type SpecialEntree = z.infer<typeof entreeSchema>;
export type SpecialFeatured = z.infer<typeof featuredSchema>;
export type SpecialSoup = z.infer<typeof soupSchema>;
export type SpecialSoupTier = z.infer<typeof soupTierSchema>;
export type SpecialCombo = z.infer<typeof comboSchema>;
export type SpecialDessert = z.infer<typeof dessertSchema>;
export type SpecialAdditionalSection = z.infer<typeof additionalSectionSchema>;
export type SpecialAdditionalItem = z.infer<typeof additionalItemSchema>;
export type SpecialUncertainItem = z.infer<typeof uncertainItemSchema>;

/**
 * OpenAI Structured Outputs JSON schema (strict mode). Strict mode requires
 * every property to be listed in `required` and `additionalProperties: false`
 * everywhere; optional fields are expressed as nullable types, not omitted.
 * The Zod schema above re-validates the response so feature code never trusts
 * the wire shape blindly.
 */
export const SPECIAL_MENU_JSON_SCHEMA = {
  name: "daily_special_menu",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      restaurantName: { type: ["string", "null"] },
      dateLabel: { type: ["string", "null"] },
      dateText: { type: ["string", "null"] },
      address: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      title: { type: "string" },
      subtitle: { type: ["string", "null"] },
      entrees: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            description: { type: ["string", "null"] },
            price: { type: ["string", "null"] },
            confidence: { type: "number" },
          },
          required: ["name", "description", "price", "confidence"],
        },
      },
      featured: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            price: { type: ["string", "null"] },
          },
          required: ["name", "description", "price"],
        },
      },
      soups: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: ["string", "null"] },
            tiers: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: ["string", "null"] },
                  price: { type: ["string", "null"] },
                },
                required: ["label", "price"],
              },
            },
          },
          required: ["name", "tiers"],
        },
      },
      combos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            price: { type: ["string", "null"] },
          },
          required: ["name", "price"],
        },
      },
      veggiePlate: {
        type: ["object", "null"],
        additionalProperties: false,
        properties: {
          description: { type: ["string", "null"] },
          price: { type: ["string", "null"] },
        },
        required: ["description", "price"],
      },
      dessertsLabel: { type: ["string", "null"] },
      desserts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            price: { type: ["string", "null"] },
          },
          required: ["name", "price"],
        },
      },
      sides: { type: "array", items: { type: "string" } },
      additionalSections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            note: { type: ["string", "null"] },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: ["string", "null"] },
                  price: { type: ["string", "null"] },
                },
                required: ["name", "description", "price"],
              },
            },
          },
          required: ["title", "note", "items"],
        },
      },
      uncertainItems: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            section: { type: "string" },
            rawText: { type: ["string", "null"] },
            issue: { type: "string" },
            suggestedValue: { type: ["string", "null"] },
          },
          required: ["section", "rawText", "issue", "suggestedValue"],
        },
      },
    },
    required: [
      "restaurantName",
      "dateLabel",
      "dateText",
      "address",
      "phone",
      "title",
      "subtitle",
      "entrees",
      "featured",
      "soups",
      "combos",
      "veggiePlate",
      "dessertsLabel",
      "desserts",
      "sides",
      "additionalSections",
      "uncertainItems",
    ],
  },
} as const;

export const SPECIAL_MENU_EXTRACTION_PROMPT = [
  "You are extracting a restaurant daily specials menu from an image.",
  "Return only JSON matching the provided schema.",
  "",
  "Rules:",
  "- Preserve menu item names, prices, sections, notes, and date — using the board's exact wording; never reword, retitle, or drop text.",
  "- Ignore the printed letterhead (restaurant name, address, phone number) entirely — always return null for restaurantName, address, and phone. The app standardizes these from the restaurant's profile, so whatever the photo's letterhead says is never used.",
  '- The DATE is the exception to the letterhead rule and MUST be read: put the specials board\'s date (e.g. "7-13-26") into dateText exactly as written — it is dynamic per board and gets shown in the letterhead. The date is usually handwritten near the title (e.g. "Happy Monday 7-13-26"), not in the printed address block. Put any greeting or day-name shown before the date (e.g. "Happy Monday") in dateLabel. If no date is legible, set dateText to null.',
  '- Capture any printed instructional note near the title exactly as written (e.g. "Entrée with 2 sides starts at $12.95. Additional side $2 more.") as `subtitle`. Printed (non-handwritten) text is still menu content — only the letterhead above is ignored.',
  "- Do not invent missing items or prices.",
  "- If an item is CROSSED OUT or struck through, treat it as removed for today and do NOT include it — the staff took it off the board. If you can't tell whether something is struck through, include it but add an uncertainItems entry noting the doubt.",
  "- If a field is unreadable, use null and add an entry to uncertainItems.",
  '- Prices must be numeric strings without the dollar sign, such as "12.95". Non-numeric prices like "MP", "market price", or a range like "12/18" are allowed as-is.',
  "- Keep descriptions separate from item names when possible.",
  "- featured is a LIST — include every spotlighted/featured item the board calls out (often boxed or starred). soups is a LIST — one entry per soup, each with a name and a `tiers` list of {label, price} price options (e.g. [{label:\"Cup\",price:\"3.75\"},{label:\"Bowl\",price:\"6.50\"}], or [{label:\"Small\"...},{label:\"Large\"...}], or a single {label:null,price:\"5.00\"} for a one-price soup). Read whatever size/label words the board actually uses — do not assume Cup/Bowl.",
  "- CATCH-ALL — additionalSections: if the board has ANY section that does not fit the fixed categories (entrées, featured, soups, combos, veggie plate, desserts, sides) — for example Breakfast, Appetizers, Kids Menu, Beverages/Drinks, Wings, Seafood, Sandwiches, Family Packs, Lunch Specials — put it here as {title (the board's own header), note (any per-section instruction like \"All served with cornbread\", else null), items:[{name, description, price}]}. NEVER cram such a section into entrées/sides and NEVER drop it. This bucket exists so nothing on the board is ever lost. Use a section's `note` for per-section instructional text that applies to the whole section.",
  '- Watch for a category header followed by a list of named options that all share one price',
  '  (e.g. "SLICE OF CAKE: Coconut, Chocolate, Cheese Cake, Carrot, Seasonal Pies — $4.95",',
  '  or "PIE: Apple, Cherry, Pecan"). This is a common handwritten-board pattern. In that case,',
  "  extract EACH named option as its own separate item (in the appropriate array — usually",
  "  desserts), each carrying that same shared price. Never collapse the group into a single",
  "  item using only the category header as the name — that silently drops every option but one.",
  '- dessertsLabel: the dessert section\'s own header text exactly as written on the board (e.g. "Slice of Cake"), so the rendered menu can title that section with the board\'s wording; null if the board has no distinct dessert header.',
  "- Normalize obvious spelling/capitalization only when confidence is high.",
  "- Set confidence per entree from 0 to 1 reflecting how sure you are of the handwriting reading (lower for illegible or ambiguous words).",
  "- Do not redesign the menu.",
  "- Do not output HTML, Markdown, SVG, or an image prompt.",
  "- The goal is accurate structured menu data for deterministic rendering.",
  '- If the image has no readable menu content, return the schema with empty arrays and a title of "Daily Specials".',
].join("\n");

/** Is there enough here to be worth publishing? Guards against silently shipping an empty/broken extraction. */
export function hasMeaningfulContent(menu: DailySpecialMenu): boolean {
  return (
    menu.entrees.length > 0 ||
    menu.combos.length > 0 ||
    menu.desserts.length > 0 ||
    menu.sides.length > 0 ||
    menu.featured.some((f) => f.name || f.price) ||
    menu.soups.some((s) => s.name || s.tiers.some((t) => t.price)) ||
    Boolean(menu.veggiePlate?.description || menu.veggiePlate?.price) ||
    menu.additionalSections.some((s) => s.items.length > 0)
  );
}
