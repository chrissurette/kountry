# 08 — Key Risks & Design Mitigations

## AI text garbling in Daily Specials images — resolved architecturally (2026-07-16)

History: Daily Specials went OCR-to-structured-text (Phase 1) → AI *image generation* (2026-07-15, gpt-image-1 hand-lettering the whole menu) → **AI extraction + deterministic rendering (2026-07-16)**. The middle approach was abandoned because it produced exactly the failure it was warned about here: asking one image model to simultaneously *read* a dense handwritten board and *re-letter* it produced soft, inconsistent, "AI-looking" text with real price/name errors (a live test on a ~35-item board came back with most prices wrong, several names misspelled, one item dropped). Prompt/quality/size tuning improved it but couldn't reach "reliable enough for a real menu" — the model's read-and-reletter fidelity at text volume is a ceiling, not a knob, and there was no ground truth anywhere in the pipeline to check output against.

**Current architecture removes the risk structurally rather than mitigating it:**

- **AI reads, app draws.** A vision model (OpenAI `gpt-4o` via the `extractJson` capability, docs/05) extracts the photo into structured JSON (`DailySpecialMenu`, `src/lib/menu/special-menu-schema.ts`) using OpenAI Structured Outputs (strict `json_schema`), re-validated with Zod. The model never renders the final text.
- **Owner edits the extracted data** on the Review screen before anything is rendered — every name, price, section is an editable field. Low-confidence entrees and an `uncertainItems` list are highlighted so the owner's attention goes where the read was shakiest.
- **The menu is rendered deterministically as SVG in app code** (`src/lib/menu/render-special-menu-svg.ts`, a pure function) — every readable character is a real SVG `<text>` node, so prices and names are *exactly* the structured data, pixel-crisp, never generated. Themes (`special-menu-themes.ts`) control colors/fonts/borders, not lettering.
- **Mandatory owner review before publish** still holds (unchanged design principle); publishing is gated on a successful render of the current (edited) data.
- Residual risks now are ordinary software concerns, not model-fidelity gambles: extraction can still *miss* or *mis-read* an item (owner catches it in the editable review), and the SVG layout uses approximate text-width math for wrapping (long descriptions could wrap imperfectly — cosmetic, not a correctness risk to prices/names). The old gpt-image-1 path remains only so legacy PNG snapshots keep rendering.

### Format-robustness hardening (2026-07-15) — the schema no longer dictates the board's structure

An audit asked "how easily does this break if the handwritten board's *format* changes?" The honest answer at the time: the schema had a **fixed set of named buckets** (entrées, one featured, one cup/bowl soup, combos, one veggie plate, desserts, sides), and — because extraction is strict OpenAI Structured Outputs — a board with any *new kind* of section (Breakfast, Appetizers, Kids Menu, Beverages, Wings…) had nowhere to go: the model was forced to cram it into entrées/sides or **silently drop it**. Robust to variation *within* the buckets (counts, prices, wording, spatial layout), brittle to new *categories*. Hardened so the board's structure is no longer constrained to a fixed shape:

- **Catch-all `additionalSections`** (`{title, note, items[]}`): any section that doesn't fit the recognized categories is captured verbatim — the board's own heading, an optional per-section note, and its items — and rendered full-width below the sides. The strict-schema "no field for it → dropped" failure mode is gone; nothing on the board is lost. Editable on the Review screen ("Other sections"), translated like any other copy.
- **Generic soup pricing.** Soup was hardwired to `cupPrice`/`bowlPrice`. Now `soups[]` (a list) where each soup has `tiers: [{label, price}]` — the model reads whatever size words the board uses (Cup/Bowl, Small/Large, or a single unlabeled price). No more mis-labeling a "Small/Large" soup as "Cup/Bowl".
- **`featured` and `soups` are lists**, so a board can spotlight more than one feature or offer more than one soup without one being dropped or merged.
- **Struck-through items** are now explicitly handled by the extraction prompt (treated as removed for the day; flagged in `uncertainItems` if ambiguous) rather than silently transcribed onto the published menu.
- **Backward-compatible.** A top-level Zod `preprocess` (`migrateLegacySpecialData`) upgrades legacy stored `special_data` on read (old single `soup`/`featured` → the new array shapes; missing `additionalSections` → `[]`), so pre-existing drafts and re-published snapshots keep validating and rendering. Verified live: a legacy draft's old cup/bowl soup migrates into the new tiers and renders unchanged; a fresh extraction of a standard board still produces clean data; and crafted boards with multiple featured, a single-price soup, and Breakfast/Kids `additionalSections` all render correctly on both language sides.

## API cost & rate limits

- Owner's **own keys** cap blast radius and make cost visible/attributable.
- Metering on every call with a spend dashboard in Settings.
- Client-side image downscaling before upload (image-gen APIs bill by image size).
- OpenAI's `gpt-image-1` at "medium" quality, 1024×1024, is the fixed default (docs/05) — deliberately the cheaper tier rather than an expensive default.
- Public endpoint is edge-cached, so site traffic costs ~nothing regardless of visitor volume — the image generation cost only happens once per publish, not per page view.

## Secret storage

- Provider keys encrypted at rest (AES-256-GCM with a server-only master key, app-side in `src/lib/providers/crypto.ts` — not Supabase Vault, which this line used to claim and which is not used anywhere).
- Decrypted only inside server request handlers; never in client bundles, logs, or API responses (last-4 display only); write-only key API.
- Uploaded source photos in private Storage buckets behind signed URLs; the *generated* Daily Special image is deliberately in a separate **public** bucket (`site-media`) since anonymous site visitors need to view it — docs/03's Main Menu vs. Daily Specials note.

## Publish reliability

- Snapshots are **immutable** and created *before* scheduling — what was approved is what goes live.
- Scheduled-function promotion is idempotent (`WHERE status='pending'` guard) — double-fires are harmless.
- Any bad publish is reversible in one tap via history re-publish (pointer flip back).

## Spanish Daily Specials (built 2026-07-15)

The public site's static text and Main Menu are bilingual (docs/06's "Language toggle" and "Main Menu Spanish translation" notes); Daily Specials got the same treatment, extending the existing extract-and-render pipeline rather than replacing it — same design as originally proposed here, now shipped:

1. **Translate the structured data, not the image.** `menus.special_data` (`DailySpecialMenu`, docs/03) is a JSON object of short strings (item names, descriptions, section labels) with prices kept separate as free-text — exactly the shape a translation call is reliable at. Unlike the abandoned gpt-image-1 "hand-letter the whole menu" approach (this doc's first section), nothing here asks a model to *render* text, only to translate strings it's handed directly. `src/lib/menu/translate-special-schema.ts`'s `extractTranslatableUnits()` flattens the menu into `{id, text}` pairs (a path string like `entrees.2.description` as `id`) — deliberately excluding `restaurantName`/`address`/`phone` (facts, not copy) and every price field — and `applyTranslations()` writes results back by path, leaving anything untranslated as the original English text.
2. **The `translate_menu` task and `TextProvider.generateJson`** (docs/05) — proven for Main Menu, reused as-is. `src/lib/menu/translate-special-service.ts`'s `translateSpecialMenu()` does the whole board in one call (no chunking needed — unlike Main Menu's ~200 items, one day's board is a few dozen strings at most), and returns a complete, ready-to-render `DailySpecialMenu`.
3. **`menus.special_data_es jsonb`** (migration `20260706000026_daily_special_translations.sql`), same `DailySpecialMenu` shape, no `themeId` wrapper (the theme is shared with the English render). Filled in by **"Translate to Spanish"** on the Review screen (`review-special-client.tsx`) — the owner reviews/edits the Spanish text in the same accordions as the English side (a **"Show Spanish"** toggle reveals amber-tinted parallel fields) before anything renders. Never auto-published untranslated or unreviewed, consistent with this doc's "mandatory owner review before publish" principle. Unlike Main Menu's "only fill gaps" translate behavior, re-running it here fully retranslates (the button relabels to "Re-translate to Spanish") — the right tradeoff at this much smaller, single-draft scale.
4. **A second SVG** via the same pure `renderSpecialMenuSvg()` (`src/lib/menu/render-special-menu-svg.ts`) fed the Spanish data and the same theme — this is a second function call, not new rendering logic. `renderAndStoreSpecial()` (`src/lib/menu/render-special-service.ts`) does both together whenever a Spanish draft exists, storing the result as `menus.generated_image_path_es` alongside the English `.svg`, and leaves any previously-saved Spanish render untouched when it isn't (an English-only re-render never silently deletes an existing translation).
5. **Publish carries both images in one snapshot** — `buildMenuSnapshotPayload()` (`src/lib/themes/build-payload.ts`) takes an `imageUrlEs` param alongside `imageUrl`; `published_snapshots.payload.menu` has both. A snapshot is still one immutable unit; nothing about the pointer-flip publish model changed.
6. **The public site's language toggle selects which image renders** on `/` and `/menu` — `src/lib/public-menu/service.ts`'s `localizedSpecialsImageUrl()` picks `imageUrlEs` when the visitor's locale is `es` and one exists, falling back to `imageUrl` otherwise (a special published before this feature, or one the owner hasn't translated).

**Bug found during end-to-end testing, fixed same day:** step 4 above originally claimed the renderer was "language-agnostic (it just lays out whatever strings it's given)" — that was wrong. `renderSpecialMenuSvg()` draws several **structural labels itself**, outside the translatable `DailySpecialMenu` data — box titles ("Soup of the Day", "Veggie Plate", "Combos", "Featured"), row labels ("Cup"/"Bowl"/"Price"), the sides-grid heading ("Choose Your Sides"), and the fallback title ("Daily Specials"). These were hardcoded English string literals baked into the drawing code, so a "translated" Spanish render still showed "Soup of the Day" and "Choose Your Sides" verbatim — the item names/prices were correctly translated, but the surrounding structure wasn't. Caught by testing a real publish on both language sides of the live site (fetching and grepping the actual rendered SVG text, not just eyeballing the preview) rather than by code review — the bug was invisible in the data layer, since `special_data_es` itself was completely correct. Fixed by giving `renderSpecialMenuSvg(menu, theme, locale)` a third parameter selecting a small internal `LABELS` table (`en`/`es`); callers pass the locale matching the *data* being rendered (English data → `"en"`, translated data → `"es"`) — deliberately unrelated to the admin UI's own display language, which is an independent setting. Every call site updated: the Review screen's two live previews (`previewDataUrl`/`previewDataUrlEs`) and `renderAndStoreSpecial()`'s two persisted renders.

Every non-negotiable design rule held: no hardcoding, `restaurant_id` seam untouched, publish stayed a pointer flip, provider keys stayed server-side, and it's additive — old snapshots with no `_es` fields render exactly as before.

## Vendor lock-in (accepted, mild)

Netlify + Supabase are both replaceable (Next.js self-hosts; Supabase is Postgres + S3-compatible storage). The provider abstraction means AI vendors are configuration. Accepted trade-off for near-zero maintenance.
