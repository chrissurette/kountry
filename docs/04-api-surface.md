# 04 — API Surface

All endpoints are Next.js route handlers. Authenticated routes require a Supabase session and are scoped by RLS. Public routes are keyed by restaurant `slug`; the reads are edge-cached, the one write (subscribe) is not.

**Access control (role gate):** the session middleware (`src/lib/supabase/middleware.ts`) additionally enforces `restaurant_members.role`. An **owner** reaches everything; an **employee** is confined to the Daily Special generator — the allowed API prefixes are `/api/menus/*`, `/api/uploads`, `/api/schedules/*` (and the `/admin/menus/*` pages). Every other authenticated `/api` returns **403** for an employee, and non-generator `/admin` pages redirect them to `/admin/menus/new` (a redirect, never a 404 — an employee is never shown a control they can't use: `AdminNav` filters its links by role).

RLS is member-level by default, so **the middleware is the role boundary for most tables** — but it is *not* the only one. Since 2026-07-16 the tables holding customer PII, live credentials, and public-site content are **owner-only in the database as well** (`subscribers`, `email_fax_requests`, `publish_targets`, `social_posts`, `main_menu_*`, and `restaurants` UPDATE). See docs/03's RLS table for the full list and reasoning; the audit behind it found the middleware had been the *only* thing stopping an employee from editing the Main Menu and profile via dev tools.

**Rate limiting (added 2026-07-16):** the three public POSTs below are the only unauthenticated writes, and all go through a per-client fixed-window limiter (`src/lib/rate-limit.ts` → `bump_rate_limit()`, migration `20260706000030`): subscribe ~10/hour, unsubscribe ~30/hour, email-fax requests ~10/hour, keyed on an HMAC-hashed client IP (never stored raw). Over-limit requests get **429**; the limiter **fails open** on any error so a DB hiccup can never block a signup or an opt-out.

## Public (no auth, edge-cached 60s SWR, on-demand revalidated on publish)

| Endpoint | Purpose |
|---|---|
| `GET /api/public/{slug}/menu` | Live published Daily Specials snapshot JSON. The site's own `/menu` page and homepage read this data via a direct function call instead (faster) — this HTTP endpoint is for any future cross-origin consumer. |
| `GET /api/public/{slug}/main-menu` | The permanent Main Menu (hand-typed, always current — no snapshot/publish lifecycle) |
| `POST /api/public/{slug}/subscribe` | `{email?, phone?}` (at least one required) — homepage mailing-list signup (docs/03). A *write* on this public surface; no session, service-role insert, honeypot field, de-duped per restaurant. Re-signup by someone who previously unsubscribed clears their suppression (that submission is their opt-in). Not edge-cached (a write, not a read) but shares the same open-CORS stance as the reads above. |
| `POST /api/public/unsubscribe` | `{token}` — performs a mailing-list opt-out. Not slug-scoped: the token identifies exactly one subscriber and is its own authorization. **POST-only by design** — the emailed link points at the `/unsubscribe` *page*, which confirms first, because mail scanners/prefetchers GET every URL in a message and a mutating GET would unsubscribe people who never clicked. Idempotent; unknown tokens get a generic 404 so the list can't be probed. |
| `POST /api/public/{slug}/email-fax-list` | `{businessName, method: fax\|email\|both, fax?, email?, days?, notes?}` — daily-special delivery request from the public `/email-fax-list` form (docs/03; added 2026-07-16). Same defenses as subscribe: honeypot (named `website` here — the form has a real business-name field), Zod validation (contact required for each named channel), per-hashed-IP rate limit (`email_fax` scope, 10/hr). Every valid submission inserts — it's a log, no dedupe. After a successful insert the route also **forwards the submission server-side to Netlify Forms** (`public/__forms.html` registers the `email-fax-list` form; `src/lib/email-fax/netlify-notify.ts`) so the owner gets Netlify's email notification — best-effort with a 5s timeout, never fails the request, no-ops in local dev (docs/09). |

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
| `DELETE /api/menus/{id}` | Delete an **unpublished draft** from the Library. Returns 409 for published/scheduled specials because their immutable History snapshots keep referencing the rendered files. Draft deletion removes its English/Spanish SVGs and social JPEGs from Storage. The `/api/item-library/*` routes were removed 2026-07-16 when the Library became "Saved Specials". |

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

## Authenticated — subscribers

| Endpoint | Purpose |
|---|---|
| `GET \| POST /api/subscribers` | List all subscribers (incl. unsubscribed, with status; `unsubscribe_token` deliberately excluded from the response) / manually add one (`source: "manual"`). POST **409s on a suppressed contact** — the owner can't re-add someone who unsubscribed. |
| `DELETE /api/subscribers` | `{ids: string[]}` — bulk delete (checkbox-selected rows in `/admin/subscribers`, not a per-row `/{id}` route, since the UI action is multi-select). This is the *hard* delete; unsubscribing is separate and only suppresses. |
| `GET /api/subscribers/export` | CSV download (`Content-Disposition: attachment`) of everyone **still subscribed** who has an email, each row carrying its own `unsubscribe_url`. The exclusion is the opt-out's enforcement point, and the URL column is how the token reaches a real inbox — origin comes from the request, not `NEXT_PUBLIC_SITE_URL` (which isn't set on Netlify). |
| `GET /api/subscribers/export/phones` | Same shape for **phone numbers** (added 2026-07-16): every still-subscribed row with a phone, each with its `unsubscribe_url` — closes the "phone-only subscriber can never receive their opt-out link" gap (docs/09). For manual contact only, **not** an SMS-marketing surface (mini-TCPA consent isn't captured at signup); suppressed rows excluded, same as the email export. |
| `GET \| DELETE /api/email-fax-list` | List / bulk-delete (`{ids}`) the daily-special delivery requests shown at `/admin/email-fax-list` (added 2026-07-16). Owner-only twice over: not in the employee middleware allowlist **and** the table's RLS is owner-only (docs/03). |

## Authenticated — social publishing (owner-only, docs/10)

| Endpoint | Purpose |
|---|---|
| `GET /api/social/meta/connect` | Starts the Meta OAuth flow — a **redirect**, not a fetch (the browser has to leave for facebook.com). Mints a `state` nonce into an httpOnly cookie for CSRF. Redirects to Settings with `?social=not_configured` if `META_APP_ID`/`META_APP_SECRET` are unset. |
| `GET /api/social/meta/callback` | Where Facebook returns. Verifies `state` against the cookie, exchanges code → short-lived → long-lived user token, reads `/me/accounts` for the Page + Page token, discovers the linked IG account, and upserts `publish_targets` with the **encrypted Page token** (the user token is discarded — Page tokens don't expire). Always redirects to `/admin/settings?social=…` with a flag the panel turns into a human message; never leaks a raw Meta error. |
| `PATCH \| DELETE /api/social/meta` | `{id, enabled}` to pause/resume one target · disconnect entirely (deletes the targets and their tokens; `social_posts` history survives). |
| `POST /api/menus/{id}/social-images` | Signed upload URLs for the two social JPEGs the browser composes at "Save & render". **Employee-reachable** (it's under `/api/menus`, which employees need for the Daily Special flow) — it only mints upload targets for the caller's own restaurant and can't touch the social connection. |

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
