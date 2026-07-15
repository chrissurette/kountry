# MyMenuAgent

A mobile-first PWA that turns a photo of a handwritten restaurant menu into a
polished, on-brand digital menu — published to the restaurant's website
instantly, no redeploy.

The full architecture, data model, API surface, and phased build plan live in
[`docs/`](docs/) and are the source of truth for this project (see
[`CLAUDE.md`](CLAUDE.md)). This README only covers getting the app running
locally.

## What's implemented

> **Note (2026-07-15):** the Phase 1/2 lists below are an accurate historical
> record of what shipped, but two things changed since: Daily Specials moved
> from OCR-parse-to-structured-text to AI **image generation** (replacing the
> parse route, structured Review editor, and Compare mode entirely), and the
> `widget.js` + standalone hosted page (`/m/{slug}`) were **deleted outright**
> once this app became the restaurant's own site. See
> [CLAUDE.md](CLAUDE.md)'s pivot notes for the full history — the "Try it"
> walkthroughs further down describe the current flow accurately.

**Phase 0 — Foundation**
- Next.js 16 App Router PWA scaffold (TypeScript, Tailwind), installable with
  offline app-shell caching via `serwist`
- Full Supabase schema (`supabase/migrations/`) — every table, RLS policy,
  and index from [docs/03-data-model.md](docs/03-data-model.md)
- Supabase Auth (email + password sign-in), session-aware route protection
- The restaurant profile: `GET`/`PATCH /api/restaurant` and a working Settings
  screen (identity, hours, social, brand, menu defaults)

**Phase 1 — MVP loop (historical):** photo → live website, end to end, via
Gemini vision/OCR parsing a photo into structured text, a Review & Correct
screen, and a Design/Publish screen with one theme — plus a hosted page and
embeddable widget. All superseded; see the note above.

**Phase 2 — Breadth (historical):** OpenAI/xAI vision adapters, Comparison
mode (OCR A/B with a field-level diff), three more text-menu themes with a
theme picker, History, and an Item library that auto-learned recurring items
from reviewed menus. Scheduling, History, and the Item library concept all
survived the later pivots (in updated form, below); Comparison mode and the
theme picker for Daily Specials did not.

**Current state (since 2026-07-15) — full public website + AI image pipeline**
- This app is the restaurant's entire public website, not a tool paired with
  a widget on a separate site — see [CLAUDE.md](CLAUDE.md)'s "Architecture
  pivot" note. The staff tool lives at `/admin`; the public site (Home, Menu,
  About, Visit, Gallery, Catering, Order) lives at the root, fully
  profile-driven, with its own warm design system (`src/lib/site/`)
- **Daily Specials is AI-image-based**, not OCR-to-text: capture a photo of
  the handwritten board → OpenAI `gpt-image-1` generates a styled image of it
  (pick a style preset, regenerate freely) → approve on the merged Review &
  Publish screen → publish. `GET /api/public/{slug}/menu` and the public
  site's own pages are the only consumers now — no hosted page, no widget
  (see the note above)
- A permanent, hand-typed **Main Menu** (`/admin/main-menu`) alongside Daily
  Specials — the public `/menu` page shows both, with category jump
  navigation (Breakfast / Lunch & Dinner / Beverages) for larger menus
- **Item library** (`/admin/library`) is now view/manage only — nothing
  auto-learns into it since Daily Specials stopped producing structured text
- Scheduling (pick a future date/time instead of publishing now) and History
  (`/admin/history`, one-tap re-publish) both carried over unchanged
- Staff-uploadable hero + gallery photos (`/admin/site`), stored in a public
  Storage bucket separate from the private menu-photo bucket
- On-demand ISR revalidation: publishing, scheduling, Main Menu saves,
  Settings saves, and Site Photos changes all update the live site
  immediately rather than waiting out each page's revalidate window
- Deployed on **Netlify** (moved from Vercel) — see "Deploying to Netlify" below

Not yet built: additional publish targets (social posting), multi-tenant
onboarding/billing, satori template exports, usage dashboard. See
[docs/07-roadmap.md](docs/07-roadmap.md) for what's next (Phase 3).

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Run the migrations against it, in order. Either:
   - **Supabase CLI**: `supabase link --project-ref YOUR_REF` then
     `supabase db push` (picks up everything in `supabase/migrations/`), or
   - **SQL editor**: open each file in `supabase/migrations/` in numeric
     order and run it.
3. Seed the shared theme catalog: run
   [`supabase/seed/seed_themes.sql`](supabase/seed/seed_themes.sql).
4. Create the owner's auth user: in the Supabase dashboard, **Authentication →
   Users → Add user**, set an email + password, and enable "Auto Confirm User".
   (The app signs in with email + password and has no public sign-up, so the
   user is created here.)
5. Bootstrap your restaurant: open
   [`supabase/seed/bootstrap_owner.sql`](supabase/seed/bootstrap_owner.sql),
   fill in your user id and restaurant details, and run it. This is a
   one-time manual step by design — see the comments in that file and
   `restaurants`' RLS policies in
   [`docs/03-data-model.md`](docs/03-data-model.md) for why restaurant
   creation isn't yet a self-serve client action.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase URL/keys from Project Settings → API, and generate the
two secrets as described in `.env.example`.

## 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you'll see the
public site. Staff sign-in is at `/login` (linked from the footer); enter the
owner's email + password (created in step 4 above) and you'll land in `/admin`.

Note: `npm run dev` and `npm run build` pass `--webpack` explicitly. Next.js
16 defaults to Turbopack, but `serwist` (the PWA service-worker tooling) only
integrates via webpack today — see the comment in
[`next.config.ts`](next.config.ts).

### Try the Daily Specials golden path

1. In Settings → AI Providers (`/admin/settings`), paste an [OpenAI API key](https://platform.openai.com/api-keys) (used for `gpt-image-1` image generation) and hit Save, then Test.
2. Click **New Daily Special** in the admin header, take/choose a photo of the handwritten specials board.
3. Wait for the generated image, then pick a different style preset or hit **Try again** if you want another take — each regenerates from the same source photo.
4. On the Review & Publish screen, confirm the generated image looks right and hit **Approve & Publish** (or **Schedule**).
5. Visit the site's own homepage and `/menu` page — both show the generated image directly, reading the same published snapshot via `GET /api/public/{slug}/menu`.

### Try the other features

- **Scheduling:** pick a date/time and hit Schedule instead of Publish now. Locally, trigger promotion by hand since there's no scheduled function running in dev:
  ```bash
  curl -X GET http://localhost:3000/api/cron/promote-schedules -H "Authorization: Bearer $CRON_SECRET"
  ```
- **History:** `/admin/history` lists every publish; re-publish any of them with one click.
- **Item library:** view/manage entries at `/admin/library` — nothing auto-learns into it anymore since Daily Specials stopped producing structured text (docs/07).
- **Main Menu:** hand-type the permanent menu at `/admin/main-menu` — no photo, no AI, live immediately. Shows on the public `/menu` page above any Daily Special.
- **Site Photos:** upload a hero photo and gallery images at `/admin/site` — they appear on the homepage and `/gallery` right away.

## 5. Build

```bash
npm run build
npm run start
```

The service worker (`public/sw.js`) is generated at build time from
[`src/app/sw.ts`](src/app/sw.ts) and is disabled in development.

## Deploying to Netlify

Netlify supports this app's stack zero-config (Next.js App Router, SSR, ISR,
middleware — all auto-detected; no `[[plugins]]` block needed in
`netlify.toml`). What actually needs setting up:

1. Push this repo to GitHub (or GitLab/Bitbucket) and connect it as a new
   Netlify site — Netlify auto-detects the Next.js build.
2. In the Netlify site's **Environment variables**, set everything from
   `.env.example` with real production values. In particular:
   - `NEXT_PUBLIC_SITE_URL` — optional. Auth no longer uses it (email +
     password sign-in has no redirect). Its only use is the scheduled
     function's local `netlify dev` fallback, and in production Netlify's own
     auto-injected `URL` variable covers that — so you can leave it unset on
     Netlify.
   - `SITE_RESTAURANT_SLUG` — which restaurant this deployment serves
     (optional today with only one restaurant row, but set it explicitly).
   - `CRON_SECRET` — same value the scheduled function sends as
     `Authorization: Bearer $CRON_SECRET`.
3. That's it for scheduling — `netlify/functions/promote-schedules.mts` is
   a Netlify Scheduled Function (`* * * * *`, every minute) already
   configured to fire on deploy. Unlike Vercel's Hobby tier (daily-only
   cron), Netlify supports 1-minute scheduled functions on every plan
   including free, so this fires on time with no plan upgrade needed.
4. Add your custom domain in Netlify's **Domain management** once you're
   ready to point DNS at it.

## Known gaps to close before shipping

- `public/icons/icon.svg` is a placeholder monogram. Replace with real PNG
  icons (192×192, 512×512, and a 180×180 apple-touch-icon) before testing
  "Add to Home Screen" on iOS — Safari doesn't accept SVG there.
- Restaurant/owner creation is a manual SQL step (see step 2.5 above) until
  self-serve onboarding is built (deferred multi-tenant work, docs/07).
