# 06 — Module / Component Breakdown

Rewritten 2026-07-15 — the original version of this doc described a standalone menu tool (OCR-parsed text review + an embeddable widget as a core module). Both are gone: Daily Specials is AI-image-based now, and this app is the restaurant's whole public site rather than a tool paired with a widget on a separate one. See CLAUDE.md's "Architecture pivot" and "Daily Specials image pipeline" notes for the full history.

## `/admin` — the staff PWA

- **Capture** (`/admin/menus/new`) — camera (`<input capture>`) or upload; client-side downscale + JPEG re-encode before upload (halves image-gen API cost). Immediately generates a styled image with a default style and lands on Review & Publish — no separate parse step.

- **Review & Publish** (`/admin/menus/{id}/review`) — *the quality lever of the whole product.* Shows the AI-generated image large; owner can **Regenerate** (same style, another attempt) or pick a different **style preset** (auto-regenerates), then **Approve & Publish Now** or **Schedule**. No text editing — if the image is wrong, regenerate or fix the source photo. This merges what used to be three separate screens (Review, Design, Publish) into one, since there's no OCR text to correct and no theme to pick once the image is already styled.

- **Main Menu** (`/admin/main-menu`) — the permanent menu, hand-typed (sections → items → name/price/price-note/description), no AI/photo involved. Saves atomically via `replace_main_menu()`; live immediately, no publish step — same "direct edit" model as the profile itself. Sections carry a `category` (breakfast/lunch_dinner/beverages, drives the public `/menu` page's jump navigation) and an optional shared description.

- **Site Photos** (`/admin/site`) — upload/replace the homepage hero photo and manage the gallery grid; same signed-upload-URL pattern as Capture, into the public `site-media` Storage bucket (deliberately separate from the private `assets` bucket menu photos use).

- **History** (`/admin/history`) — snapshot archive with one-tap re-publish; "Preview" renders any past snapshot via the legacy `ThemeRenderer` (still needed here even though the public site no longer uses it — see "Two separate design systems" below).

- **Saved Specials** (`/admin/library`) — a browsable grid of every rendered Daily Special (any menu with a rendered image, drafts included); open one to edit/re-publish, or delete it. This replaced the old Item Library UI (2026-07-16). Rendering a special automatically adds it here, so nothing made is ever lost even if unpublished. Backed by `src/lib/menu/saved-specials-service.ts`.

- **Settings** (`/admin/settings`) — *the* restaurant profile editor (`GET|PATCH /api/restaurant`): identity, hours, social, brand colors/fonts, menu defaults, and AI Providers (add/test/remove keys, per-task provider+model picker for `image_gen`, usage/spend dashboard).

## Public site (`/`)

Fully profile- and snapshot-driven — nothing restaurant-specific is hardcoded (design rule #1). No session/auth cost; every page is ISR'd and revalidated on-demand when something changes (`src/lib/publish/service.ts`, `src/lib/site/revalidate.ts`).

- **Home** (`/`) — hero (profile-driven text + either the Daily Specials preview card/modal or the uploaded hero photo, whichever applies), highlight cards, and a visit strip (hours, directions).
- **Menu** (`/menu`) — Main Menu (grouped by category with jump navigation) plus a "Today's Specials" section showing the live AI-generated image, if one's published.
- **About**, **Visit**, **Gallery**, **Catering**, **Order** — profile-driven contact/hours/social; Gallery shows staff-uploaded photos; Order is a "coming soon" placeholder with a Call-to-Order CTA until online ordering ships.

### Language toggle (EN/ES) — step 1 of Spanish translation (added 2026-07-15)

Every public page is bilingual for its code-owned text: nav, buttons, headings, and the hero/about/catering/highlights/reviews prose (`src/lib/site/content.ts`), all keyed by locale and picked up via a `site_locale` cookie (`src/lib/i18n/`). The EN/ES pill lives in `SiteNav`, reachable in both the desktop header and the mobile top bar. Deliberately cookie-based rather than `/en`/`/es` URL prefixes — no route restructuring, matches docs/01's low-maintenance stance. Trade-off: a Spanish visitor's pages aren't independently indexable or shareable by URL yet; worth revisiting with locale-prefixed routing if Spanish-language search traffic turns out to matter, which is plausible given Immokalee's demographics.

### Main Menu Spanish translation — step 2 (added 2026-07-15)

`main_menu_sections`/`main_menu_items` each carry `name_es`/`description_es` alongside the English fields (docs/03). A **"Translate to Spanish"** button in `/admin/main-menu` (`src/app/admin/main-menu/main-menu-editor.tsx`) sends whatever section/item text doesn't already have a translation to `POST /api/main-menu/translate` (`translate_menu` provider task, docs/05) and fills in the result — re-running it later only translates newly-added items, never overwrites a translation the owner already reviewed or hand-corrected. A **"Show Spanish fields"** toggle reveals editable Spanish inputs (amber-tinted, directly under each English one) so the owner reviews/corrects before publishing, same principle as Daily Specials' mandatory review (docs/08) — nothing is shown to customers untranslated-and-unreviewed. `Save` always round-trips both languages through `replace_main_menu()`, which deletes and reinserts every row on every save; the public `/menu` page shows the Spanish field when the visitor's language toggle is ES and one exists, falling back to English per-field otherwise (`src/app/(marketing)/menu/page.tsx`'s `localize()`).

### Daily Special Spanish translation — step 3 (added 2026-07-15)

The Review & Publish screen (`src/app/admin/menus/[id]/review/review-special-client.tsx`) gets the same treatment as Main Menu, adapted to a single day's board rather than a large persistent catalog: a **"Translate to Spanish"** button sends the current (possibly owner-edited, not-yet-saved) `DailySpecialMenu` to `POST /api/menus/{id}/translate-special` in one call — no chunking needed at this scale — and a **"Show Spanish"** toggle reveals amber-tinted Spanish fields inside each accordion (Header, Entrées, Featured, Soup, Combos, Veggie plate, Desserts, Sides) plus a second live SVG preview, so the owner reviews the Spanish board exactly the way they review the English one before anything renders. Unlike Main Menu's "only fill gaps" behavior, re-running Translate here fully retranslates from the current English text every time — appropriate given the much smaller, single-draft scope (the button is explicitly labeled "Re-translate to Spanish" once a translation exists, so it's never an accidental overwrite). **"Save & render"** now renders and stores *both* images together whenever a Spanish draft exists — same deterministic renderer, same theme, just different text in (docs/08's "AI reads, app draws" guarantee holds for the Spanish artifact too, since translation only ever changes the input data, never the rendering code). Publishing carries both `imageUrl` and `imageUrlEs` in the snapshot payload; the public site's language toggle picks whichever matches the visitor's locale, falling back to English if no Spanish render exists yet.

### `/admin` itself is bilingual — step 4 (added 2026-07-15)

The three steps above translate content the public site *shows*; this one translates the staff tool *itself*, so a Spanish-speaking employee can run the whole Daily Special workflow without reading English. Scoped deliberately to what an **employee** can actually reach — the login screen, the admin nav shell, Capture (`/admin/menus/new`), and Review & Publish — since employees are already middleware-gated (docs/04) to exactly that surface; Settings/Main Menu/History/Site Photos stay English-only for now (owner-only screens, not a blocker for employee usage, but a natural next step if the owner wants a Spanish admin experience too).

Same `site_locale` cookie as the public toggle and Main Menu/Daily Specials translation — one preference, shared across the whole app, since there's no reason a device's language setting should reset at the `/admin` boundary. `AdminNav` (`src/app/admin/admin-nav.tsx`) carries the same EN/ES pill as `SiteNav`, both in the desktop row and the mobile top bar next to the hamburger. The login screen (`src/app/login/`) was split into a server `page.tsx` (reads the cookie) + client `login-form.tsx` (renders with it) — it had been a single client component, which can't call the server-only `getLocale()`; the `signIn` server action (`actions.ts`) localizes its own two error messages the same way, since Server Actions can read cookies directly. Everything else (`new-special-client.tsx`, `review-special-client.tsx`) follows the same `getDictionary(locale).admin.*` pattern as the public site and Main Menu editor.

Deliberately out of scope for this step: error messages that originate *inside* an API response body (a specific `ProviderError` message, a raw Supabase error) stay English — only the client-side fallback strings shown when a request fails outright are localized (e.g. `t.errorRender`/`t.errorPublish`/`t.errorTranslate`/`t.errorSchedule`, sign-in's two messages). Errors are rare enough in practice, and translating the full provider/storage error taxonomy is a much larger surface, that this was left as a known gap rather than block shipping the parts staff hit every day.

## Shared infrastructure

- **Auth/session** — Supabase Auth wrapper; `src/proxy.ts` guards only `/admin`, the auth flow, and authenticated APIs (public pages are excluded so they never pay the session-refresh cost).
- **Service worker** (`src/app/sw.ts`) — app-shell caching for the `/admin` PWA (installable, offline-tolerant for the staff tool specifically — the manifest's `start_url`/`scope` are both `/admin`).
- **Two separate design systems, deliberately**:
  - `src/lib/site/theme.ts` — the public site's design system (warm defaults + brand-profile overrides → CSS variables). Used by every marketing page.
  - `src/lib/themes/` (`registry.tsx`/`tokens.ts`/the four theme components/`image-special.tsx`) — the older per-snapshot theming pipeline, now only exercised by History's live preview of past `published_snapshots` rows. Kept rather than deleted since History still needs to render old snapshots faithfully, including ones with a chosen theme from before Daily Specials became image-based.

## Not yet built (deferred, docs/07 Phase 3)

- Template PNG exports (satori) in social/print sizes.
- Provider usage dashboard polish.
- Offline capture queue (photo persists in IndexedDB, syncs when back online).
