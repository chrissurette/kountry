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
  encrypted_key text,                       -- base64 AES-256-GCM ([12B IV][16B tag][ciphertext]), app-side in lib/providers/crypto.ts.
                                            -- NOT bytea (PostgREST serializes it ambiguously) and NOT Supabase Vault (never used) —
                                            -- both were claimed in earlier drafts of this doc; corrected 2026-07-16.
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

subscribers          -- mailing-list capture from the homepage signup form
  id uuid PK, restaurant_id FK,
  email text NULL, phone text NULL,         -- at least one required (CHECK constraint)
  source text CHECK (source IN ('homepage','manual')) DEFAULT 'homepage',
  unsubscribe_token text UNIQUE,            -- 32 random bytes as hex; the capability in an unsubscribe link
  unsubscribed_at timestamptz NULL,         -- NULL = subscribed; set = suppressed (kept, not deleted — see design note)
  created_at timestamptz
  -- partial UNIQUE indexes on (restaurant_id, lower(email)) and (restaurant_id, phone), each WHERE the column IS NOT NULL
  -- RLS: owner-only, NOT the usual any-member policy — a deliberate exception, see design note

rate_limit_counters  -- fixed-window rate limiting for the public form POSTs (added 2026-07-16)
  key text PK,                               -- "{scope}:{hmac-sha256(client ip)}" — NEVER a raw IP (docs/09)
  window_start timestamptz, count int
  -- no restaurant_id: keys are per-client, not per-tenant; RLS enabled with ZERO policies
  -- (service-role only, via the atomic bump_rate_limit() function); rows self-sweep after 1 day

email_fax_requests   -- daily-special delivery requests from the public /email-fax-list form (added 2026-07-16)
  id uuid PK, restaurant_id FK,
  business_name text,                        -- or a first name for individuals (the form says either is fine)
  method text CHECK (method IN ('fax','email','both')),
  fax text NULL, email text NULL,            -- CHECKs require the contact matching the method
  days text[] DEFAULT '{}',                  -- ⊆ {mon..sun}; empty = "every day"
  notes text NULL,
  created_at timestamptz
  -- a LOG, one row per submission, deliberately NO unique indexes (owner's call) — see design note
  -- RLS: owner-only, same exception as subscribers
```

## Design notes

- **JSONB vs relational:** `brand`, `menu_defaults`, `hours`, `style_overrides`, and theme `config` are JSONB because their shape will evolve. Everything queried/joined (menus, sections, items, snapshots, library, usage) is properly relational.
- **Prices:** integer `price_cents` + free-text `price_note` — handwritten menus need the "market price" / "12/18" escape hatch. Never store floats.
- **Snapshots are self-contained:** `payload` embeds everything needed to render (including resolved brand tokens and theme config), so old snapshots render identically even after profile/theme edits.
- **RLS:** the *default* policy is `restaurant_id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid())` — any member, with the owner/employee split enforced by the middleware rather than the database. Public read access only via server-side service role on the snapshot pointed to by `live_snapshot_id`.

  **Owner-only exceptions (`AND role = 'owner'`), all 2026-07-16.** These are deliberate, and the list is closed — adding to it should be a conscious decision, not a reflex:

  | Table | Migration | Why it earned the exception |
  |---|---|---|
  | `subscribers` | `..029` | Customer PII (emails/phones) |
  | `email_fax_requests` | `..031` | Customer PII (names, fax/email, free-text notes) |
  | `publish_targets`, `social_posts` | `..032` | A live credential that can post publicly as the restaurant |
  | `main_menu_sections`, `main_menu_items` | `..033` | Owner-controlled **live public site content** |
  | `restaurants` — **UPDATE only** | `..033` | Same: the profile *is* the public site |

  The `..033` pair came from an **employee-access audit that found the middleware was the only thing stopping an employee from editing the Main Menu and the restaurant profile** straight from browser dev tools — both of which render on the live public site. Verified after the fact with real signed-in JWTs: an employee now reads 0 main-menu rows and is refused on insert (including via `replace_main_menu`, which is `security invoker`, so policies apply to the RPC too — there is no bypass).

  **`restaurants` SELECT stays member-level, deliberately — do not "finish the job".** The employee's own work reads that row: `current-restaurant.ts` (the `/admin` layout; without it every employee screen degrades to the "no restaurant linked" dead end), the standardized letterhead at parse *and* render time, and `createSnapshot`'s payload freeze. Nothing is protected by hiding it either — the profile's address, phone and hours are published on every page of the public site. The risk was only ever unauthorized *edits*.

  **`rate_limit_counters`** has RLS enabled with *no* policies at all (service-role only; it also carries no `restaurant_id`, since a rate counter is keyed by client, not by tenant — infrastructure, not restaurant data, so design rule #2's multi-tenant seam doesn't apply to it).
- **Item library matching:** start with `pg_trgm` trigram similarity (cheap, no embedding calls). pgvector is a possible later upgrade, not part of the current plan.
- **Main Menu vs. Daily Specials (added 2026-07-14):** `main_menu_sections`/`main_menu_items` are the permanent menu — hand-typed by staff in `/admin/main-menu`, tied directly to `restaurant_id`, always live with no draft/publish/snapshot lifecycle (same "direct edit, immediately live" model as the `restaurants` profile itself, since it changes rarely). This is deliberately separate from `menus`/`menu_sections`/`menu_items`, which is now scoped to **Daily Specials only** — the AI capture → parse → review → publish pipeline. The public `/menu` page renders both: the Main Menu, then a "Today's Specials" section from the live snapshot if one is published.
- **`assets.content_hash`:** parse results are cached against the photo hash so re-opening the review screen never re-bills the vision API.
- **Main Menu Spanish translation (added 2026-07-15):** `name_es`/`description_es` on both Main Menu tables hold an owner-reviewed Spanish translation of the corresponding English field, filled in by the "Translate to Spanish" action in `/admin/main-menu` (`translate_menu` provider task, docs/05) rather than typed from scratch. Always nullable — a null/empty `name_es` just means "not translated yet," and the public `/menu` page falls back to the English field per-field when that happens (`src/app/(marketing)/menu/page.tsx`'s `localize()`/`localizeNullable()`). `replace_main_menu()` deletes and reinserts every section/item row on every save (ids are not stable across saves), so the editor always resends whatever `name_es`/`description_es` it currently has — including untouched ones — or a plain English-only edit would silently drop existing translations.
- **Daily Special Spanish translation (added 2026-07-15):** `special_data_es`/`generated_image_path_es` on `menus` are the same idea as Main Menu's, adapted to the Daily Special shape — a "Translate to Spanish" action on the Review screen (`translate_menu` task, same as Main Menu) translates every customer-facing string in the extracted `DailySpecialMenu` (entrée/combo/dessert/side names, descriptions, title, subtitle, date text — deliberately **not** `restaurantName`/`address`/`phone`, which are facts, not copy, or any price field), the owner reviews/edits it same as the English side, then "Save & render" renders it through the *same* deterministic SVG renderer (`render-special-menu-svg.ts`) and *same* theme as the English version — translation only ever changes which text goes in, never how it's drawn, so the "AI reads, app draws" guarantee (docs/08) holds for the Spanish artifact too. `published_snapshots.payload.menu` carries both `imageUrl` and `imageUrlEs`; the public site's language toggle picks whichever matches the visitor's locale, falling back to English if no Spanish render exists yet (`src/lib/public-menu/service.ts`'s `localizedSpecialsImageUrl()`).
- **Daily Special auto-clears at local midnight (added 2026-07-14):** a Daily Special is "today's" special — it should disappear on its own overnight so the site never shows a stale board. `restaurants.live_since` records when the current `live_snapshot_id` was flipped live (set by both publish-now and the scheduled promotion). The per-minute promote-schedules cron (docs/02) also runs `clearStaleLiveSpecials()`, which nulls `live_snapshot_id`/`live_since` once `live_since` falls on an earlier calendar day than "now" **in the restaurant's timezone** (`menu_defaults.timezone`, default `America/New_York`). The snapshot and its menu are untouched — they stay in History and the Library and can be re-published — only the live pointer clears. Once cleared, the homepage falls back to the uploaded hero photo (or the "check back soon" placeholder if none). For live specials published before this column existed, `live_since` is null and the code falls back to the snapshot's `published_at`.
- **Subscribers (added 2026-07-16):** the homepage's mailing-list signup form (`src/app/(marketing)/subscribe-form.tsx`) posts to `POST /api/public/{slug}/subscribe`, which has no user session — it uses the service-role client (same reasoning as the public menu read path) to resolve `restaurant_id` from the slug and insert. `email`/`phone` are both nullable but a CHECK constraint requires at least one; two partial unique indexes (each `WHERE column IS NOT NULL`) de-dupe per restaurant so a visitor resubmitting the form doesn't create a second row — the insert's unique-violation (`23505`) is caught and turned into a friendly "already on the list" response, not an error. `source` distinguishes real homepage signups from rows the owner adds by hand at `/admin/subscribers` (a table with checkbox multi-select, bulk delete, a manual-add form, and a CSV export of emails — the first bulk-select/bulk-delete UI pattern in the admin, and the first CSV export; no prior convention existed for either, see docs/04 and docs/06). Owner-only screen (not employee-accessible, per the existing middleware allowlist), and — like Settings/Main Menu/History/Site Photos — stays English-only; only its nav label is translated.
- **Email/Fax daily-special requests are a log, not a deduped list (added 2026-07-16):** `email_fax_requests` backs the public `/email-fax-list` page — a native replication of the owner's Microsoft Form ("Fax and Email Preference For Daily Special": business/first name, fax/email/both, contact details, days of the week, notes) that the owner pivoted to hosting in-app so every entry lands in our own table. **One row per submission, no unique indexes, by the owner's explicit call ("log each entry")** — a repeat or corrected request just adds a row and the owner reconciles at `/admin/email-fax-list` (its intro says: keep the newer, delete the older). This is deliberately NOT merged into `subscribers` despite the overlap: different consent ("send me the menu itself, on these days, by these channels" vs. "email me news"), a contact type `subscribers` has no column for (fax), and different processing (the owner sends manually; nothing in the app sends). Empty `days` means "every day". These rows double as the **consent record for faxing** (Junk Fax Act — docs/09), which is why the admin intro warns not to delete someone until sending to them has stopped.
- **Unsubscribe is suppression, not deletion (added 2026-07-16):** `unsubscribed_at` marks an opt-out and the row **stays**. This is the load-bearing decision in the whole feature: deleting would discard the fact that the person opted out, so a later manual add or CSV re-import could silently re-subscribe them — the exact thing an opt-out exists to prevent. Consequences that follow from it, and that any future change here has to preserve: (1) the CSV export filters `unsubscribed_at is null` — the export is the mailing surface until sending exists, so that filter *is* the opt-out's enforcement; (2) `createSubscriberByOwner` **refuses** a suppressed contact rather than reviving it — the owner cannot re-add someone who left; (3) `createSubscriberPublic` **does** clear `unsubscribed_at` on a repeat signup, because the person submitting the form themselves is a genuine opt-in — without that branch the unique index would reject their insert, they'd be told "already on the list," and they'd stay suppressed forever, subscribed in their mind and opted-out in ours; (4) `unsubscribe_token` is **not** in `listSubscribers`' column allowlist (`SubscriberListItem`), so it never rides along in the admin page's serialized HTML — only the export reads it. The token is stable across an unsubscribe/resubscribe cycle, so links in already-sent mail keep working. See docs/09 for the compliance reasoning.
