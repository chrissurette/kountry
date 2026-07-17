# 10 — Meta (Facebook + Instagram) Auto-Publishing: Integration Design

Researched against the live Meta developer docs on 2026-07-16 (Graph API is at ~v25.0; every claim below cites what the docs actually say, not memory). This is the **structure** for wiring a business Meta account into the backend so publishing a Daily Special can also post it to the restaurant's Facebook Page and Instagram Business account. It fills in the `publish_targets` seam docs/07 reserved.

> **Status: BUILT 2026-07-16** (design accepted and implemented the same day). This doc remains the *why*; CLAUDE.md's dated note records what shipped. Everything below was implemented as described, with one addition: the Graph client pins **v23.0** rather than following the unversioned endpoint. **The code is inert until the owner completes the checklist below** — with `META_APP_ID`/`META_APP_SECRET` unset the feature simply reports "Not set up yet" and nothing else changes. No real Graph call has been exercised yet; that needs the owner's app.

## The finding that makes this practical

Meta permissions come in two access levels. **Advanced Access** — needed when an app serves businesses that don't own it — requires Business Verification and App Review. But **Standard Access**, granted automatically with no review, works for "app users who have a role on the requesting app."

This app is single-tenant: the restaurant owns it. So the owner creates their own Meta app, gives their own Facebook account the Admin role on it, and **Standard Access covers everything — no App Review, no Business Verification, ever** (unless this goes multi-tenant, which flips the whole calculus; see "Multi-tenant later"). This is the same "the owner brings their own keys" posture as the AI providers.

## Facts established from the docs (constraints the design must obey)

| Fact | Consequence |
|---|---|
| IG publishing is a **two-step flow**: `POST /{ig-user-id}/media` (params `image_url`, `caption`) → returns container ID → `POST /{ig-user-id}/media_publish` (param `creation_id`) | The server does two sequential Graph calls per IG post |
| IG accepts **JPEG only** ("the only image format supported"), max 8MB, max width 1440px (scaled down beyond), **aspect ratio must be within 4:5 to 1.91:1** | Our SVG can't be posted, and even a PNG can't; and a *long* menu board (taller than 4:5) violates the ratio — see "Image pipeline" |
| The IG image must be at a **publicly accessible URL** — the API fetches it, you don't upload bytes | The JPEG must land in the public `site-media` bucket before posting; its public URL is what the API gets |
| IG caption: ≤2,200 chars, ≤30 hashtags | Caption built from `special_data` (title/date) + a link line fits trivially |
| IG rate limit: 100 API posts per rolling 24h | Irrelevant at one post/day; still check-able via `GET /{ig-user-id}/content_publishing_limit` |
| Facebook Page photo post: **`POST /{page-id}/photos`** with `url` + `message`, permission `pages_manage_posts`, Page access token | One call; no documented ratio restriction, so FB can take the natural-ratio image |
| IG Business/Creator account must be **linked to a Facebook Page**; the page's IG account is discovered via `GET /{page-id}?fields=instagram_business_account{id,username}` | One connect flow yields both targets; IG is unavailable if the owner never linked IG to the Page (surface that state, don't fail) |
| OAuth: standard authorization-code flow (`https://www.facebook.com/v25.0/dialog/oauth` → redirect with `code` → server exchanges via `GET /oauth/access_token` with app id + secret) | Two owner-only routes: connect (redirect out) + callback (exchange) |
| Short-lived user token → **long-lived (~60 days)** via `grant_type=fb_exchange_token`; then Page tokens fetched via `GET /{user-id}/accounts` from a long-lived user token **do not expire** (invalidated only by password change / deauth / security events) | Store the **Page token** as the durable credential; discard the user token after setup. No refresh cron needed — but invalidation is possible, so failed posts must be visible and "Reconnect" must exist |
| Scopes needed: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish` | Requested once in the connect dialog |

## Architecture

### Schema — `publish_targets` (+ a post log), per docs/07's reserved seam

```
publish_targets      -- one row per destination; a Meta connect creates 1–2 rows
  id uuid PK, restaurant_id FK,
  kind text CHECK (kind IN ('facebook_page','instagram_business')),
  enabled boolean NOT NULL DEFAULT true,      -- owner can pause a target without disconnecting
  page_id text NOT NULL,                      -- both kinds anchor on the Page (IG posts use the Page token too)
  ig_user_id text NULL,                       -- instagram_business only
  display_name text NOT NULL,                 -- "Kountry Kitchen" / "@kountrykitchen" — what Settings shows
  encrypted_access_token text NOT NULL,       -- the PAGE token, AES-256-GCM via src/lib/providers/crypto.ts (same
                                              -- base64-text pattern as provider_credentials; NEVER surfaced to the client)
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
  -- RLS: owner-only (the subscribers/email_fax_requests exception — this is a credential store)

social_posts         -- append-only log; how failures become visible
  id uuid PK, restaurant_id FK,
  target_id uuid FK -> publish_targets,
  snapshot_id uuid FK -> published_snapshots,
  status text CHECK (status IN ('posted','failed')),
  external_post_id text NULL,                 -- FB post id / IG media id
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
  -- RLS: owner-only, same reasoning
```

Why one row per target rather than one per connection: the post-publish hook stays exactly the loop docs/07 promised ("iterate enabled targets"), each target can be paused independently (owner may want FB but not IG some day), and a future non-Meta target (Google Business, X…) is another `kind`, not another table.

### OAuth flow — owner-only routes under `/api/social/meta/*`

1. **`GET /api/social/meta/connect`** — builds the dialog URL (`client_id`, `redirect_uri`, `scope`, `state`) and redirects. `state` is a random nonce also set in an httpOnly cookie — checked in the callback (CSRF; an attacker must not be able to attach *their* Facebook grant to our session).
2. **`GET /api/social/meta/callback`** — verify `state`; exchange `code` → short-lived user token (server-side, app secret never leaves env); exchange again → long-lived user token; `GET /me/accounts` → the Page(s) + **Page tokens**; `GET /{page-id}?fields=instagram_business_account{id,username}`. Insert `publish_targets` rows (FB always; IG only if linked), encrypting the Page token. Discard the user token. Redirect to Settings with a success flag. If the account admins several Pages, a picker is needed — for Kountry Kitchen (one Page) auto-select-if-single is correct, with the picker as the fallback UI.
3. **`DELETE /api/social/meta`** — disconnect: delete the rows (and thus the encrypted tokens). Middleware already makes `/api/social` owner-only by omission from the employee allowlist; RLS backstops it.

New env vars: `META_APP_ID`, `META_APP_SECRET` (server-only; `.env.example` placeholders + the Netlify UI; secret handled like `PROVIDER_KEY_ENCRYPTION_SECRET` — never logged, never client-side).

### Settings UI — beside AI Providers (owner's stated placement)

A **"Social accounts"** panel in `/admin/settings`, same card pattern as AI Providers: disconnected → one "Connect Facebook & Instagram" button (link to `/api/social/meta/connect`); connected → the Page/IG names, per-target enable toggles, last-post status (from `social_posts`), Reconnect and Disconnect. Show the token like a provider key is shown: by its consequence (display name + connected date), never the credential.

### Post-publish hook — the seam docs/07 reserved

`publishMenuNow()` and the cron promotion both end with the pointer flip + `revalidatePublicMenuSurfaces()`. Add one call after that point: `postToSocialTargets(admin, restaurantId, snapshot)` —

- loads enabled `publish_targets`, decrypts tokens server-side (cron path has no session; service-role is the sanctioned pattern there),
- posts FB first (`/{page-id}/photos` with the image URL + caption), then IG (container → publish),
- writes one `social_posts` row per attempt,
- is **best-effort by construction**: any failure logs and never fails or delays the publish itself (the Netlify-Forms-notify philosophy — the site going live is the job; the crosspost is a bonus). No retries in v1; the owner sees a failed row in Settings and can re-publish or post manually.

Caption v1: `"{title} — {dateText}"` + a fixed line like `"Full menu: kountrykitchenfl.com/menu"` from the profile, from the **English** `special_data` (IG/FB posts are single-language; the site handles ES). A per-restaurant caption template is a later refinement.

### Image pipeline — the part that actually needs design care

The published artifact is an SVG; IG takes **JPEG only**, from a **public URL**, ratio **4:5–1.91:1**. Our boards are 1000px wide with content-driven height — a long board is taller than 4:5 and would be rejected.

**Decision: the browser renders the JPEGs at "Save & render" time, not the server at post time.**

- `renderAndStoreSpecial()`'s client side already proves this path: the camera-roll feature rasterizes the same SVG to PNG in-browser, untainted, byte-faithful to what the owner approved. Producing two JPEGs the same way is incremental: (a) **natural-ratio JPEG** for Facebook; (b) **4:5-composed JPEG for IG** — 1080×1350 canvas, theme background fill, menu scaled to fit (a very long board shrinks; the caption's menu link is the escape hatch). Both upload to `site-media` beside the SVG and ride into the snapshot payload as e.g. `payload.menu.socialImageUrl` / `socialImageIgUrl` — so the cron promotion posts **exactly what was approved**, no re-render at fire time.
- Why not server-side rasterization (resvg/satori, the Phase 3 stack): Netlify functions have **no system fonts**, and the SVG deliberately uses system font families (`special-menu-themes.ts`) — a server render means bundling font files and accepting that the posted image differs from every preview the owner saw. The browser already holds the exact fonts the owner approved the menu in. Client-render wins on fidelity, dependency weight, and reuse of a proven path. (If satori/resvg exports get built in Phase 3 anyway, this decision can be revisited with fonts solved once.)
- Cost: "Save & render" uploads grow from 1–2 files to 3–4. Fine.

## Owner's one-time setup checklist (nothing here is code)

1. **developers.facebook.com** → Create App → type **Business**. The Facebook account doing this must be an admin of the Kountry Kitchen Page.
2. Add the **Facebook Login** product; in its settings add the redirect URIs: `https://kkmainweb.netlify.app/api/social/meta/callback` (and `http://localhost:3000/api/social/meta/callback` for dev).
3. **Leave the app in Development Mode.** Do not submit for App Review — with the owner's account holding the Admin role, Standard Access already grants every scope this needs. (Live Mode + Advanced Access only matters if other businesses ever use this.)
4. Confirm the **Instagram account is a Business (or Creator) account and is linked to the Facebook Page** (Page settings → Linked accounts). Without that link the API cannot see IG at all.
5. Copy the **App ID** and **App Secret** into `META_APP_ID` / `META_APP_SECRET` (local `.env.local` + Netlify env UI).
6. After the code ships: Settings → Social accounts → Connect, approve the dialog, done.

## Risks / known edges (recorded now so they're not re-discovered)

- **Token invalidation** is the operational risk: the never-expiring Page token dies if the owner changes their Facebook password, revokes the app, or trips a security checkpoint. Mitigation: `social_posts` failures surface in Settings + a Reconnect button. No silent-retry machinery in v1.
- **Very long boards** post to IG shrunk inside the 4:5 canvas — readable-ish, not great. Acceptable v1; alternatives (crop top, carousel split) are follow-ups.
- **The IG image URL must be public before the container call** — the flow already guarantees that (JPEGs land in `site-media` at render time, posting happens at publish time), but never reorder it.
- **Scheduled publishes post at promotion time** via the cron route — that route's runtime budget grows by 2–4 Graph calls; still trivial, but the hook must not push it past Netlify's function timeout if Meta hangs → give Graph calls a hard fetch timeout (5s, AbortSignal) like the Netlify-Forms notify.
- **Compliance:** what leaves for Meta is the rendered menu image + caption — restaurant content, zero customer PII (docs/09's OpenAI reasoning applies verbatim). The stored Page token is a credential → encrypted at rest via the existing `crypto.ts`, owner-only RLS, display-by-name-only. When built, `/privacy`'s "Who we work with" gains a Meta bullet (the standing rule).
- **Multi-tenant later** (docs/07): serving *other* restaurants means Advanced Access → Business Verification + App Review for `pages_manage_posts`/`instagram_content_publish`, or per-restaurant "bring your own Meta app". Recorded so nobody assumes today's no-review posture generalizes.

## Implementation order (when green-lit)

1. Migration: `publish_targets` + `social_posts` (owner-only RLS) — hand-applied like all others.
2. `src/lib/social/meta.ts`: Graph client (fetch + 5s timeout), token exchange helpers, `postToSocialTargets()`.
3. OAuth routes (`connect`/`callback`/`DELETE`), `state` cookie, env plumbing.
4. Render-side: compose + upload the two JPEGs in "Save & render"; snapshot payload fields.
5. Hook into `publishMenuNow` + cron promotion.
6. Settings "Social accounts" panel.
7. `/privacy` + docs/04/06/07/09 + CLAUDE.md updates; live verification against the owner's real (dev-mode) app.
