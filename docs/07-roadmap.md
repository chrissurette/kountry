# 07 — Phased Implementation Roadmap

> **Note (2026-07-15):** Phases 0–2 below are an accurate historical record of what shipped and when, but two things they describe have since been superseded by owner's explicit calls — see CLAUDE.md's "Architecture pivot" and "Daily Specials image pipeline" notes: (1) the widget + hosted page (`/m/{slug}`) were built in Phase 1/3 and then fully removed once this app became the restaurant's own site; (2) the OCR-parse-to-text pipeline (Phase 1) was replaced with AI image generation for Daily Specials. Main Menu, Site Photos, and the full public marketing site (docs/06) were built outside this phase numbering, after Phase 2.

## Phase 0 — Foundation (week 1)
Repo scaffold (Next.js 15 + TS + Tailwind), Supabase project, full schema + RLS policies from docs/03, Supabase Auth wiring, **restaurant profile record + Settings screen (identity + brand)**, PWA shell/installability.

> The profile exists **before** any menu code so nothing is ever hardcoded, even temporarily.

## Phase 1 — MVP loop (weeks 2–4)
Upload → parse (single provider: Gemini Flash) → review/correct → publish now → widget + public API + one theme.

The **provider abstraction is built now** (with one adapter behind it), including key vault storage and usage metering — retrofitting an abstraction under shipped feature code is how abstractions fail.

**Ship this: photo to live website.**

## Phase 2 — Breadth (weeks 5–7)
- OpenAI + xAI adapters; per-task model config; comparison mode with diff UI
- 3–4 more themes + per-menu style overrides
- Scheduling (snapshot-at-schedule-time + scheduled-function promotion — originally Vercel Cron, now a Netlify Scheduled Function)
- History + one-tap re-publish
- Item library with trigram fuzzy suggest wired into the review screen

## Phase 3 — Exports & polish (weeks 8–9)
- satori template exports (social/print sizes) — not yet built
- Provider usage dashboard
- Offline capture queue
- ~~AI style-reference export path~~ / ~~Hosted standalone page `/m/{slug}`~~ — both superseded: the AI style-reference concept became the Daily Specials image pipeline itself (docs/05), and the hosted page was built then removed once this app became the site (docs/02)

## Phase 4 — Hardening (week 10)
Rate limiting on public + generate-image endpoints, error taxonomy surfaced in UI, backup/restore verification, accessibility pass on the public site.

---

## Explicitly deferred (design for, do not build)

### Social-media posting — extension point
Model publishing as **publish targets**. The public site is target #1. Adding Instagram/Facebook later means:
1. New target type consuming the **existing snapshot** — which already embeds a generated image (`payload.menu.imageUrl`, docs/05) now that Daily Specials is image-based, so this is closer to ready than originally planned.
2. OAuth token stored in the credentials table (same encryption path as provider keys).
3. A post-publish hook: after the pointer flip, iterate enabled targets.

No schema surgery, no publish-path changes. Do not build any of this now; keep the post-publish code path a single obvious seam.

### Multi-tenant onboarding/billing
Already structural: `restaurant_id` on every table, `restaurant_members`, RLS, slug-keyed public API. Later work is signup/onboarding UI and billing — not schema or architecture changes. Adding a restaurant must always mean adding a row.
