# 04 — API Surface

All endpoints are Next.js route handlers. Authenticated routes require a Supabase session and are scoped by RLS. Public routes are read-only, keyed by restaurant `slug`, and edge-cached.

**Access control (role gate):** the session middleware (`src/lib/supabase/middleware.ts`) additionally enforces `restaurant_members.role`. An **owner** reaches everything; an **employee** is confined to the Daily Special generator — the allowed API prefixes are `/api/menus/*`, `/api/uploads`, `/api/schedules/*` (and the `/admin/menus/*` pages). Every other authenticated `/api` returns **403** for an employee, and non-generator `/admin` pages redirect them to `/admin/menus/new`. (RLS itself is member-level; the role separation is this middleware gate.)

## Public (no auth, edge-cached 60s SWR, on-demand revalidated on publish)

| Endpoint | Purpose |
|---|---|
| `GET /api/public/{slug}/menu` | Live published Daily Specials snapshot JSON. The site's own `/menu` page and homepage read this data via a direct function call instead (faster) — this HTTP endpoint is for any future cross-origin consumer. |
| `GET /api/public/{slug}/main-menu` | The permanent Main Menu (hand-typed, always current — no snapshot/publish lifecycle) |

## Authenticated — capture & generate

| Endpoint | Purpose |
|---|---|
| `POST /api/uploads` | Returns signed upload URL for Supabase Storage; creates `assets` row |
| `POST /api/menus/generate-image` | `{asset_id, style_key, menu_id?}` — legacy image-gen path (docs/05), kept only so old drafts still resolve. Omit `menu_id` for the first generation (creates a draft menu); pass it back to regenerate/restyle the same draft, replacing its image. |
| `POST /api/menus/parse-special` | `{asset_id, menu_id?}` — the current Daily Specials path (docs/08's extract-and-render refactor): vision-extracts the photo into structured `DailySpecialMenu` JSON (`ocr_parse` task), no image generated yet. |
| `POST /api/menus/{id}/render-special` | `{menu, themeId, menuEs?}` — deterministically renders the (owner-edited) structured menu to SVG and uploads it; this is what "Save & render" calls. `menuEs` is optional (docs/08's Spanish translation) — when present, a second Spanish SVG is rendered with the same theme and stored alongside the English one; when omitted, any previously-saved Spanish render is left untouched. |
| `POST /api/menus/{id}/translate-special` | `{menu}` — translates a Daily Special's customer-facing text to Spanish (`translate_menu` task, docs/05). Stateless like Main Menu's translate route: returns a full translated `DailySpecialMenu` for the Review screen to show and let the owner correct before rendering/saving. |

## Authenticated — menu editing

| Endpoint | Purpose |
|---|---|
| `GET \| DELETE /api/menus/{id}` | Read / delete a Daily Special draft |
| `GET \| PATCH /api/main-menu` | The permanent Main Menu — hand-typed, no AI/photo involved. PATCH replaces the full sections+items payload atomically and takes effect immediately, no publish step. |
| `POST /api/main-menu/translate` | `{units: [{id, name, description}]}` — translates section/item name+description to Spanish (`translate_menu` provider task, docs/05). Stateless: doesn't touch the database, just returns translations for the Main Menu editor to review and include in its next PATCH. |
| `DELETE /api/menus/{id}` | Delete a saved special from the Library (also removes its rendered `.svg` from Storage). The `/api/item-library/*` routes were removed 2026-07-16 when the Library became "Saved Specials". |

## Authenticated — publish, schedule, history

| Endpoint | Purpose |
|---|---|
| `POST /api/menus/{id}/publish` | `{at?: iso8601}` — omit `at` to publish now (snapshot + pointer flip + on-demand revalidation); include it to schedule (snapshot now, pointer flip at `fire_at`) |
| `GET \| DELETE /api/schedules/{id}` | Inspect / cancel pending schedules |
| `GET /api/history` | Snapshot archive with previews (rendered via the legacy `ThemeRenderer`, docs/06) |
| `POST /api/snapshots/{id}/republish` | One-tap re-publish: pointer flip to an old snapshot |

## Authenticated — site photos

| Endpoint | Purpose |
|---|---|
| `GET \| POST /api/site-media` | List / create an upload target for a hero or gallery photo (public `site-media` bucket) |
| `DELETE /api/site-media/{id}` | Remove a hero or gallery photo |
| `POST /api/site-media/confirm` | Triggered by the client after a Storage upload actually completes; revalidates `/` and `/gallery` on-demand |

## Authenticated — profile & settings

| Endpoint | Purpose |
|---|---|
| `GET \| PATCH /api/restaurant` | The full profile: identity, hours, social, brand, menu defaults — everything the Settings screen edits |

## Authenticated — providers

| Endpoint | Purpose |
|---|---|
| `POST /api/providers/keys` | Add key (write-only; response never echoes the key) |
| `GET /api/providers/keys` | List: provider + `key_last4` + status only |
| `DELETE /api/providers/keys/{id}` | Remove key |
| `POST /api/providers/keys/{id}/test` | Cheap validation call; updates `status` |
| `GET \| PATCH /api/providers/task-config` | Per-task provider/model selection (currently just `image_gen`) |
| `GET /api/providers/usage?from=&to=` | Metering rollup for the usage dashboard |

## Internal

| Endpoint | Purpose |
|---|---|
| `GET /api/cron/promote-schedules` | Polled every minute by a Netlify Scheduled Function (`netlify/functions/promote-schedules.mts`), secret header; idempotent promotion of due schedules |

## Not yet built (deferred, docs/07 Phase 3)

- Template PNG exports (satori) and an AI style-reference export path — planned, not implemented.
