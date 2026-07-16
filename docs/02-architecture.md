# 02 — High-Level Architecture & No-Redeploy Publish Path

## This app is the whole site (as of 2026-07-14)

Originally this was a standalone menu tool that published to the owner's *separate* existing website via an embeddable widget. The owner's existing site was already a Netlify project for the same restaurant — so by owner's explicit call, this app was restructured to **be** that restaurant's public website, with the menu tool moved to `/admin`. See CLAUDE.md's "Architecture pivot" note and docs/01's "Superseded decision" note for the full context. The widget (`widget.js`, Shadow DOM) and the standalone hosted page (`/m/{slug}`) were fully removed on 2026-07-15 once the site's own `/menu` page covered the same need directly — the "all surfaces read one public API" rule (below) meant that removal was a deletion, not a rewrite: the same `GET /api/public/{slug}/menu` payload shape just gained a direct in-app consumer.

## System diagram

```
Owner's phone (PWA, at /admin)              Public website (this app, at /)
   │ photo upload (signed URL)                 │ Home · Menu · About · Visit ·
   ▼                                           │ Gallery · Catering · Order
┌─────────────────────────────────────────────────────────────┐
│  Netlify (Next.js — one repo, one deploy, zero-config)      │
│  ├─ Public marketing site — profile- and snapshot-driven,   │
│  │  no auth/session cost (src/app/(marketing)/)             │
│  ├─ /admin PWA (capture, review & publish, settings,        │
│  │  main menu, site photos, history, item library)          │
│  ├─ Authenticated API  ──► AI Provider Layer ──► OpenAI      │
│  │                         (adapters, metering)  (image_gen)│
│  ├─ Public read API (edge-cached, 60s SWR, on-demand ISR    │
│  │  revalidation on publish)                                 │
│  └─ Netlify Scheduled Function: promote due publish         │
│     schedules (netlify/functions/promote-schedules.mts)     │
└──────────────┬──────────────────────────────────────────────┘
               ▼
   Supabase: Postgres (menus, main menu, snapshots, item library, profile)
             Storage (photos, site media)
             Auth  (provider keys are encrypted app-side, not in Vault — docs/01)
```

## The publish path — a pointer flip, not a deploy

1. Owner taps **Approve & Publish Now**. The server **materializes a snapshot**: it resolves the AI-generated Daily Special image + restaurant profile + brand config into one immutable, self-contained JSON document (`MenuSnapshotPayload`, docs/03) and inserts it into `published_snapshots`.
2. The server sets `restaurants.live_snapshot_id` to that snapshot and revalidates the site's own ISR'd pages (`/`, `/menu`) on-demand — see `revalidatePublicMenuSurfaces()` in `src/lib/publish/service.ts`. Nothing was built or redeployed.
3. `GET /api/public/{slug}/menu` (edge-cached, 60s stale-while-revalidate) is the same data any future cross-origin consumer would read — it's just no longer the path the site itself uses, since the site calls the underlying service function directly for speed.

Because snapshots are immutable and self-contained:
- **History** is free: the archive is the `published_snapshots` table, and it's still previewable in-app (History screen, via the legacy `ThemeRenderer` — docs/06) even though the public site no longer uses that renderer.
- **One-tap re-publish** is free: point `live_snapshot_id` at an old snapshot.
- A published special can never change out from under the owner when they later edit the draft or profile.

## Scheduled go-live

Scheduling is the same operation, deferred:

1. On schedule, the snapshot is created **immediately** — what goes live is exactly what was approved, even if the draft/profile changes afterward.
2. A `publish_schedules` row records `snapshot_id` + `fire_at` + `status='pending'`.
3. A Netlify Scheduled Function (`netlify/functions/promote-schedules.mts`, every minute) hits `GET /api/cron/promote-schedules` (secret header) — the function is just the trigger; all the logic lives in that route. The handler promotes rows where `status='pending' AND fire_at <= now()` by flipping the pointer, revalidating the site's ISR'd pages on-demand, and marking `status='done'` with `fired_at`. The update is guarded (`WHERE status='pending'`) so it is **idempotent** — a double-fire or overlapping run is harmless.
4. Canceling a schedule = setting `status='canceled'` (snapshot remains in history, unlinked).

## Daily Special auto-clears at midnight

A Daily Special is "today's" board — it should clear itself overnight so the site never shows yesterday's special. Every pointer flip (publish-now and the scheduled promotion above) stamps `restaurants.live_since`. The same per-minute cron, after promoting due schedules, runs `clearStaleLiveSpecials()`: for each restaurant with something live, it nulls `live_snapshot_id`/`live_since` once `live_since` lands on an earlier calendar day than "now" **in the restaurant's own timezone** (`menu_defaults.timezone`, default `America/New_York`), then revalidates `/` and `/menu`. The snapshot/menu are untouched — they stay in History and the Library and can be re-published; only the live pointer clears. Once cleared, the homepage falls back to the uploaded hero photo, or the "check back soon" placeholder card if no hero exists (`src/app/(marketing)/page.tsx`). This is why the flip records a real timestamp rather than keying off the snapshot's `published_at` (which, for a *scheduled* special, is set when the schedule was created, not when it went live); pre-existing live specials with a null `live_since` fall back to `published_at`.

## Surfaces that consume the public API

| Surface | How |
|---|---|
| This app's own `/menu` page and homepage | Read the live snapshot + main menu server-side (direct function call, not HTTP), on-demand revalidated on publish |
| `GET /api/public/{slug}/menu` / `.../main-menu` | Open, edge-cached HTTP endpoints for any future cross-origin consumer (docs/04) |
| History's live preview (`/admin/history`) | In-app only — renders any past `published_snapshots` row via the legacy `ThemeRenderer` (docs/06) |
| Future social publishing | A new `publish_targets` consumer of the same snapshot (see docs/07) |
