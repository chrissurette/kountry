# 01 — Tech Stack (confirmed 2026-07-06)

Optimized for low maintenance and low running cost: one repo, one deploy surface, managed services everywhere, ~$0/month at single-restaurant volume (AI usage bills to the owner's own API keys by design).

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Next.js (App Router) PWA** — scaffolded on 16.x, the latest available at Phase 0 — TypeScript, Tailwind CSS | One framework serves the installable admin PWA, the restaurant's public marketing site (SSR), and the API routes. Mature PWA/service-worker tooling (`serwist`). Camera via `<input capture>` + `getUserMedia`. |
| Backend | **Next.js API routes / server actions on Netlify** (serverless, via Netlify's zero-config Next.js adapter) | Zero servers to maintain, scales to zero cost, same repo as frontend. Originally Vercel — moved to Netlify 2026-07-14, owner's call, since the owner's existing restaurant site is already a Netlify project this app now replaces. |
| Database | **Supabase managed Postgres** | Relational model fits menus/snapshots/library; Row-Level Security keyed on `restaurant_id` gives multi-tenant enforcement later without rewrites; `pg_trgm` powers item-library fuzzy matching. |
| Auth | **Supabase Auth** (email + password; username alias; owner/employee roles) | Managed and free; users created in the dashboard, no email-delivery/redirect setup; `restaurant_members` carries `username` (login alias) and `role` (owner = full admin, employee = Daily Special generator only, middleware-gated), and makes multi-account trivial later. |
| File storage | **Supabase Storage**, private buckets, signed URLs | Menu photos and style references stay private; exports served via signed or public URLs. |
| Secrets | **AES-256-GCM, app-side** (`src/lib/providers/crypto.ts`), master key from `PROVIDER_KEY_ENCRYPTION_SECRET` | Provider API keys encrypted at rest, decrypted only server-side. This row originally read "Supabase Vault (or AES-256-GCM…)" — the "or" was settled in favour of AES-256-GCM and **Vault was never used**; corrected 2026-07-16 after a compliance audit found the stale claim repeated across four docs. |
| Image export (template path) | **satori + resvg** (JSX → SVG → PNG in a serverless function) | Deterministic, brand-accurate text rendering; no headless browser; fast and cheap on serverless. |
| Scheduling | **Netlify Scheduled Function** (1-minute tick, `netlify/functions/promote-schedules.mts`) → idempotent "promote due schedules" endpoint | Simplest reliable mechanism; no queue infrastructure. Available at 1-minute granularity on every Netlify plan including free — Vercel's Hobby tier only allowed daily cron, which was an open gap before the move. |
| Edge caching | Netlify CDN, 60s stale-while-revalidate on the public menu API + on-demand ISR revalidation of the site's own pages on publish | Makes the site near-free to serve regardless of visitor traffic; on-demand revalidation means it updates immediately on publish rather than waiting out the SWR window. |

## Rejected alternatives (do not revisit without owner sign-off)

- **Cloudflare Workers + D1** — marginally cheaper, but loses Postgres (RLS, pg_trgm, Vault) and adds a second platform.
- **SPA + separate API + managed Postgres** — cleaner separation but two deploy surfaces to maintain, no benefit at this scale.

## Superseded decision: Vercel → Netlify (2026-07-14)

The original Phase 0 stack chose Vercel; this was revisited and changed by explicit owner sign-off once the product direction changed (see docs/02's "This app is the whole site" note). The owner's real restaurant website (`kountrykitchenfl.com`) was already a Netlify project, and the plan became to make this app the site itself rather than a separate tool paired with an embeddable widget on that site — at which point deploying to the same platform stopped being a nice-to-have and became the obviously correct call. Netlify's zero-config Next.js support (App Router, SSR, ISR, middleware via Edge Functions) meant no framework-level rework was needed, only the deploy-layer swap: `vercel.json` → `netlify.toml` + `netlify/functions/promote-schedules.mts` (a Scheduled Function replacing Vercel Cron). See CLAUDE.md's "Architecture pivot" note for the full scope of that change.

## Implementation notes discovered during Phase 0 scaffolding

- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (same behavior, same
  `config.matcher`). The auth session-refresh + route-guard logic lives in
  `src/proxy.ts`, not `src/middleware.ts`.
- **Next.js 16 defaults to Turbopack, which `serwist`'s Next integration
  (`@serwist/next`) does not support** — it injects a webpack-only config
  step to bundle `src/app/sw.ts` into `public/sw.js`. `npm run dev` and
  `npm run build` both pass `--webpack` explicitly to force the supported
  path (see `next.config.ts` and `package.json`). Revisit if/when
  `@serwist/turbopack` (experimental as of Phase 0) stabilizes.

## Initial AI provider coverage

- **Daily Specials image generation (docs/05):** OpenAI `gpt-image-1` via `/v1/images/edits` — the only implemented `imageGen` adapter so far. Fixed at "medium" quality, 1024×1024, as the cost-conscious default.
- Adapters for **Gemini, OpenAI, xAI** still implement the `vision`/`text` capabilities from the original OCR-based design (docs/05's three-capability abstraction), but nothing in the app currently calls `ocr_parse` or `copywriting` — Daily Specials moved to image generation and Main Menu is hand-typed. Left in place as working, documented infrastructure rather than removed, since the capability itself isn't tied to the retired feature.
