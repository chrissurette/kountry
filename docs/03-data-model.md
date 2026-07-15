# 03 — Data Model

Every table carries `restaurant_id` from day one — that is the entire multi-tenant seam. Adding restaurant #2 is an insert plus the RLS policies already written. Nothing restaurant-specific may ever be hardcoded; identity, branding, and defaults live in the `restaurants` profile row.

```sql
restaurants          -- THE profile record; edited via the Settings screen
  id uuid PK,
  slug text UNIQUE,                         -- public API key
  name text, address text, phone text, email text,
  hours jsonb,                              -- [{day, open, close}, ...]
  social jsonb,                             -- {instagram, facebook, ...}
  brand jsonb,                              -- {logo_asset_id, colors:{primary, secondary, ...},
                                            --  fonts:{heading, body}}
  menu_defaults jsonb,                      -- {currency, tax_note, disclaimer, section_order[], timezone}
  live_snapshot_id uuid NULL REFERENCES published_snapshots,  -- ← the "what's live" pointer
  live_since timestamptz NULL,              -- when live_snapshot_id was last flipped live; drives the midnight auto-clear (see design note)
  created_at timestamptz, updated_at timestamptz

restaurant_members   -- multi-tenant/auth seam
  user_id uuid REFERENCES auth.users,
  restaurant_id uuid REFERENCES restaurants,
  role text DEFAULT 'owner' CHECK (role IN ('owner','employee')),  -- employee = Daily Special generator only (middleware-gated)
  username text UNIQUE (lower),             -- optional alternate login id; sign in with this or the account email
  PRIMARY KEY (user_id, restaurant_id)

assets               -- uploaded photos, logos, style refs, generated exports
  id uuid PK, restaurant_id FK,
  kind text CHECK (kind IN ('menu_photo','logo','style_ref','export')),
  storage_path text, mime text, width int, height int,
  content_hash text,                        -- for parse-result caching
  created_at timestamptz

main_menu_sections   -- the permanent menu: hand-typed, always live, no publish step
  id uuid PK, restaurant_id FK, name text, description text, category text,
  name_es text NULL, description_es text NULL,     -- owner-reviewed Spanish translation (see design note)
  sort_order int

main_menu_items
  id uuid PK, restaurant_id FK, section_id FK,
  name text, description text,
  name_es text NULL, description_es text NULL,     -- owner-reviewed Spanish translation (see design note)
  price_cents int NULL, price_note text NULL, image_path text NULL, sort_order int

menus                -- a draft/working "Daily Special" (typically one per day)
  id uuid PK, restaurant_id FK,
  title text, service_date date,
  status text CHECK (status IN ('draft','scheduled','published','archived')),
  source_asset_id uuid FK assets,           -- the handwritten photo
  parse_meta jsonb,                         -- {provider, model, style_key} — legacy image_gen metadata (docs/05)
  special_data jsonb,                       -- {menu: DailySpecialMenu, themeId} — structured, owner-edited menu + theme (2026-07-16 extract-and-render refactor, docs/08). Null on legacy image-gen drafts.
  generated_image_path text,                -- storage path (public site-media bucket) of the rendered artifact — an .svg since the 2026-07-16 refactor, a legacy gpt-image-1 .png on older drafts
  special_data_es jsonb,                    -- owner-reviewed Spanish translation of special_data.menu (plain DailySpecialMenu, no themeId wrapper — theme is shared). Null until translated (2026-07-15, docs/08).
  generated_image_path_es text,             -- storage path of the Spanish-rendered .svg, same renderer/theme as generated_image_path. Null until translated + saved.
  theme_id uuid FK themes,                  -- legacy: only meaningful for History's preview of pre-image-pipeline snapshots
  style_overrides jsonb,                    -- legacy: same as theme_id
  created_at timestamptz, updated_at timestamptz

menu_sections         -- legacy: always empty for new (image-based) Daily Specials; kept so old snapshots still render
  id uuid PK, menu_id FK, name text, sort_order int

menu_items             -- legacy: see menu_sections
  id uuid PK, menu_id FK, section_id FK,
  name text, description text,
  price_cents int NULL,                     -- integer cents, always
  price_note text NULL,                     -- escape hatch: "market price", "12/18"
  sort_order int,
  confidence real,                          -- from OCR (retired); drives History's legacy preview flags
  library_item_id uuid FK NULL              -- linked once owner confirms

item_library         -- vestigial: no UI or code references it since 2026-07-16
                     -- (the /admin/library page was repurposed to "Saved
                     -- Specials"; the item-library service/routes were deleted).
                     -- Table + ItemLibraryEntry type kept, unused.
  id uuid PK, restaurant_id FK,
  canonical_name text,
  aliases text[],                           -- misspellings/variants seen
  last_price_cents int, price_history jsonb, -- [{price_cents, seen_at}]
  default_description text, section_hint text,
  times_seen int, last_seen_at timestamptz
  -- pg_trgm GIN index on canonical_name (and aliases); unused now that suggest/learn are gone, harmless to leave

themes               -- seeded ROWS, not code: layout key + design tokens.
                     -- legacy: only meaningful for History's preview of
                     -- pre-image-pipeline snapshots (docs/06)
  id uuid PK, key text UNIQUE, name text,
  preview_asset_id uuid FK, config jsonb

published_snapshots  -- IMMUTABLE; the unit of publishing, history, re-publish
  id uuid PK, restaurant_id FK, menu_id FK,
  payload jsonb,                            -- fully resolved: menu + profile + brand + theme
  theme_id uuid, published_at timestamptz, published_by uuid

publish_schedules
  id uuid PK, restaurant_id FK,
  snapshot_id uuid FK published_snapshots,  -- snapshot created AT schedule time
  fire_at timestamptz,
  status text CHECK (status IN ('pending','done','canceled')),
  fired_at timestamptz NULL

provider_credentials -- owner-supplied keys; ciphertext only, server-side only
  id uuid PK, restaurant_id FK,
  provider text CHECK (provider IN ('gemini','openai','xai')),
  encrypted_key bytea,                      -- Supabase Vault / AES-256-GCM (server master key)
  key_last4 text,                           -- the only displayable fragment
  status text CHECK (status IN ('active','invalid')),
  created_at timestamptz

provider_task_config -- per-task model selection
  restaurant_id FK,
  task text CHECK (task IN ('ocr_parse','copywriting','image_gen','translate_menu')),
  provider text, model text,
  PRIMARY KEY (restaurant_id, task)

provider_usage       -- metering; powers the Settings usage dashboard
  id uuid PK, restaurant_id FK,
  provider text, model text, task text,
  input_tokens int, output_tokens int, image_count int,
  est_cost_usd numeric(10,4),
  created_at timestamptz
```

## Design notes

- **JSONB vs relational:** `brand`, `menu_defaults`, `hours`, `style_overrides`, and theme `config` are JSONB because their shape will evolve. Everything queried/joined (menus, sections, items, snapshots, library, usage) is properly relational.
- **Prices:** integer `price_cents` + free-text `price_note` — handwritten menus need the "market price" / "12/18" escape hatch. Never store floats.
- **Snapshots are self-contained:** `payload` embeds everything needed to render (including resolved brand tokens and theme config), so old snapshots render identically even after profile/theme edits.
- **RLS:** every policy is `restaurant_id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid())`. Public read access only via server-side service role on the snapshot pointed to by `live_snapshot_id`.
- **Item library matching:** start with `pg_trgm` trigram similarity (cheap, no embedding calls). pgvector is a possible later upgrade, not part of the current plan.
- **Main Menu vs. Daily Specials (added 2026-07-14):** `main_menu_sections`/`main_menu_items` are the permanent menu — hand-typed by staff in `/admin/main-menu`, tied directly to `restaurant_id`, always live with no draft/publish/snapshot lifecycle (same "direct edit, immediately live" model as the `restaurants` profile itself, since it changes rarely). This is deliberately separate from `menus`/`menu_sections`/`menu_items`, which is now scoped to **Daily Specials only** — the AI capture → parse → review → publish pipeline. The public `/menu` page renders both: the Main Menu, then a "Today's Specials" section from the live snapshot if one is published.
- **`assets.content_hash`:** parse results are cached against the photo hash so re-opening the review screen never re-bills the vision API.
- **Main Menu Spanish translation (added 2026-07-15):** `name_es`/`description_es` on both Main Menu tables hold an owner-reviewed Spanish translation of the corresponding English field, filled in by the "Translate to Spanish" action in `/admin/main-menu` (`translate_menu` provider task, docs/05) rather than typed from scratch. Always nullable — a null/empty `name_es` just means "not translated yet," and the public `/menu` page falls back to the English field per-field when that happens (`src/app/(marketing)/menu/page.tsx`'s `localize()`/`localizeNullable()`). `replace_main_menu()` deletes and reinserts every section/item row on every save (ids are not stable across saves), so the editor always resends whatever `name_es`/`description_es` it currently has — including untouched ones — or a plain English-only edit would silently drop existing translations.
- **Daily Special Spanish translation (added 2026-07-15):** `special_data_es`/`generated_image_path_es` on `menus` are the same idea as Main Menu's, adapted to the Daily Special shape — a "Translate to Spanish" action on the Review screen (`translate_menu` task, same as Main Menu) translates every customer-facing string in the extracted `DailySpecialMenu` (entrée/combo/dessert/side names, descriptions, title, subtitle, date text — deliberately **not** `restaurantName`/`address`/`phone`, which are facts, not copy, or any price field), the owner reviews/edits it same as the English side, then "Save & render" renders it through the *same* deterministic SVG renderer (`render-special-menu-svg.ts`) and *same* theme as the English version — translation only ever changes which text goes in, never how it's drawn, so the "AI reads, app draws" guarantee (docs/08) holds for the Spanish artifact too. `published_snapshots.payload.menu` carries both `imageUrl` and `imageUrlEs`; the public site's language toggle picks whichever matches the visitor's locale, falling back to English if no Spanish render exists yet (`src/lib/public-menu/service.ts`'s `localizedSpecialsImageUrl()`).
- **Daily Special auto-clears at local midnight (added 2026-07-14):** a Daily Special is "today's" special — it should disappear on its own overnight so the site never shows a stale board. `restaurants.live_since` records when the current `live_snapshot_id` was flipped live (set by both publish-now and the scheduled promotion). The per-minute promote-schedules cron (docs/02) also runs `clearStaleLiveSpecials()`, which nulls `live_snapshot_id`/`live_since` once `live_since` falls on an earlier calendar day than "now" **in the restaurant's timezone** (`menu_defaults.timezone`, default `America/New_York`). The snapshot and its menu are untouched — they stay in History and the Library and can be re-published — only the live pointer clears. Once cleared, the homepage falls back to the uploaded hero photo (or the "check back soon" placeholder if none). For live specials published before this column existed, `live_since` is null and the code falls back to the snapshot's `published_at`.
