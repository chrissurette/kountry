/**
 * Curated visual styles for the Daily Specials AI image pipeline (docs/05).
 * Each preset's promptFragment gets appended to the shared base instruction
 * (see generate-image-service.ts) that keeps the model focused on
 * faithfully preserving the menu text — mangled prices/items is the known
 * risk with pure AI image generation (docs/08), which is why every
 * generated image goes through mandatory owner review before publish.
 */
export interface ImageStylePreset {
  key: string;
  label: string;
  promptFragment: string;
}

// Every fragment keeps its decorative flavor in the background, colors,
// borders, and (at most) section headings — never in the item names and
// prices themselves. Script/hand-drawn/vintage lettering for actual menu
// text is exactly what tends to garble under image generation (docs/08);
// plain block or serif lettering for line items reads as "styled" from the
// surrounding design without risking the numbers.
export const IMAGE_STYLE_PRESETS: ImageStylePreset[] = [
  {
    key: "rustic-chalkboard",
    label: "Rustic Chalkboard",
    promptFragment:
      "a rustic chalkboard aesthetic — a dark textured chalkboard background with simple hand-drawn decorative flourishes in the borders and section headings only; every item name and price in plain, bold, highly legible chalk-style block lettering, not cursive or script",
  },
  {
    key: "clean-modern",
    label: "Clean & Modern",
    promptFragment:
      "a clean, modern minimalist design — crisp plain sans-serif typography throughout, generous white space, subtle dividers, elegant and uncluttered",
  },
  {
    key: "warm-diner",
    label: "Warm Diner",
    promptFragment:
      "a warm, retro American diner aesthetic — warm cream and red tones with a nostalgic checkered or striped accent in the borders and headings; every item name and price in a plain, bold, highly legible typeface, vintage flavor kept to colors and decoration rather than the lettering itself",
  },
  {
    key: "elegant-script",
    label: "Elegant Script",
    promptFragment:
      "an elegant fine-dining menu card on a warm cream background, refined and upscale; section headings may use a sophisticated script or serif display font, but every item name and price must be in a plain, highly legible serif typeface — never script — so every number stays unambiguous",
  },
];

export const DEFAULT_IMAGE_STYLE_KEY = IMAGE_STYLE_PRESETS[0].key;

export function getImageStylePreset(key: string): ImageStylePreset {
  return IMAGE_STYLE_PRESETS.find((p) => p.key === key) ?? IMAGE_STYLE_PRESETS[0];
}
