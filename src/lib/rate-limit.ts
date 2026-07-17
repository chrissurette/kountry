import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

/**
 * Fixed-window rate limiting for the two unauthenticated public POST
 * endpoints (subscribe + unsubscribe) — docs/07's Phase 4 hardening item.
 * Backed by Postgres (`rate_limit_counters` + `bump_rate_limit()`, migration
 * 20260706000030) because this deploys to Netlify serverless: an in-process
 * counter resets on every cold start and never sees other instances'
 * traffic, so the database is the only shared state that doesn't add a new
 * service to the stack.
 *
 * Privacy: the raw client IP is NEVER stored. The counter key is an
 * HMAC-SHA256 of the IP keyed with a server-only secret (domain-separated
 * from its encryption use), so it can't be reversed by hashing the IPv4
 * space, and rows self-expire within a day (the DB function sweeps them).
 * Disclosed on /privacy; see docs/09.
 *
 * FAILS OPEN, deliberately: if the rate check itself errors (DB hiccup, or
 * the migration not yet applied — this code degrades to "no rate limiting"
 * rather than a broken form if deployed first), the request proceeds.
 * Rate limiting here is defense against spam floods, not correctness; for
 * the unsubscribe endpoint specifically, blocking a legitimate opt-out
 * would be a strictly worse outcome than letting abuse through.
 */
export type RateLimitScope = "subscribe" | "unsubscribe" | "email_fax";

const LIMITS: Record<RateLimitScope, { limit: number; windowSeconds: number }> = {
  // A real visitor signs up once, maybe fixes a typo — 10/hour is generous
  // for humans and a wall for a naive spam script.
  subscribe: { limit: 10, windowSeconds: 3600 },
  // Looser: legitimate unsubscribes must never be collateral (a shared
  // office/CGNAT IP can hold many real recipients of the same mailing).
  // The token itself is 256 bits, so brute-force isn't the threat here —
  // this is hygiene against blind request floods.
  unsubscribe: { limit: 30, windowSeconds: 3600 },
  // The /email-fax-list form (daily-special delivery requests). Every
  // submission inserts a row (it's a log, no dedupe — docs/03), so this cap
  // is the only bound on per-IP volume. Same reasoning as subscribe.
  email_fax: { limit: 10, windowSeconds: 3600 },
};

/**
 * Client IP for keying. `x-nf-client-connection-ip` is set by Netlify's
 * platform and not client-spoofable there; `x-forwarded-for` is the local-dev
 * / generic fallback. A spoofed XFF outside Netlify only lets an attacker
 * rotate keys — no worse than rotating real IPs, which per-IP limiting never
 * defends against anyway (the residual gap docs/09 records).
 */
function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Per-restaurant rate limits on AI provider calls (docs/07 Phase 4's other
 * half; the public-form half is above). The threat here isn't strangers —
 * these paths are authenticated — it's **runaway spend on the owner's own
 * API keys**: a retry loop, a stuck client re-firing a request, a bug that
 * calls extraction in a cycle. So the caps are sized to be invisible in real
 * use (a busy day is a handful of extractions and a few translations) and a
 * hard wall for anything mechanical.
 *
 * Keys use the raw restaurant UUID, not an HMAC — unlike the public limiter's
 * client IPs, a restaurant id is this app's own internal identifier, not
 * personal data, and hashing it would only make `rate_limit_counters` harder
 * to read when debugging exactly the incident this exists to stop.
 *
 * `ai_total` is the true infinite-loop backstop: whatever task a loop hammers,
 * it exhausts the shared budget too, so even a task with a generous window
 * can't run all hour.
 */
const AI_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  // One board a day, re-extracted a few times while dialing in a photo, is
  // the real ceiling; 20/hr is 5x any session ever observed on this project.
  ocr_parse: { limit: 20, windowSeconds: 3600 },
  // Covers both Daily Special translation (1 resolution per click) and Main
  // Menu translation (also 1 resolution per click — its ~7 parallel batches
  // reuse a single resolution, so the fan-out is bounded by the click).
  translate_menu: { limit: 30, windowSeconds: 3600 },
  // Legacy image generation (kept for pre-refactor drafts) — most expensive
  // per call, least used.
  image_gen: { limit: 10, windowSeconds: 3600 },
  // Defined-but-unused task; limited anyway so a future caller is born capped.
  copywriting: { limit: 20, windowSeconds: 3600 },
};
const AI_TOTAL = { limit: 60, windowSeconds: 3600 };

/**
 * Hard dollar ceiling per restaurant-local calendar day (owner's call,
 * 2026-07-16), summed from `provider_usage.est_cost_usd` — the metering that
 * already records every call's estimated cost. The hourly windows above stop
 * fast loops; this stops the slow leak they can't (something calling once a
 * minute burns real money all day while never tripping a per-hour count).
 *
 * Two honest properties of a post-hoc cost sum:
 *   - It can overshoot by at most one call: cost is recorded AFTER a call
 *     completes, so the check gates *starting* a call once the ceiling is
 *     reached, not mid-flight. Worst case ≈ $5 + one vision call (~2¢).
 *   - "Day" is the restaurant's local day (`menu_defaults.timezone`, same
 *     convention as the midnight menu auto-clear in publish/service.ts), so
 *     the reset lines up with how the owner experiences "today", not UTC.
 */
const AI_DAILY_SPEND_CEILING_USD = 5;
const DEFAULT_TIMEZONE = "America/New_York";

function localDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export interface AiRateLimitResult {
  allowed: boolean;
  /** Which guard tripped — a count window (task/total) or the daily dollar ceiling — for an actionable error message. */
  reason?: "task" | "total" | "budget";
}

/**
 * Fails open like the public limiter, and for the same reason with one more:
 * the AI flows are the owner's daily bread (the whole product is "photo →
 * published special"), and a rate-limiter DB hiccup blocking the morning
 * board would invert this feature's purpose. A real runaway loop hits the
 * database successfully by definition, so fail-open costs nothing against
 * the actual threat.
 */
export async function checkAiRateLimit(restaurantId: string, task: string): Promise<AiRateLimitResult> {
  try {
    const admin = createAdminClient();
    const taskCfg = AI_LIMITS[task] ?? { limit: 20, windowSeconds: 3600 };

    // The spend query fetches the last 26h (local "today" is always inside
    // that, whatever the timezone/DST does) and filters to the local day in
    // JS — a handful of rows on any real day, far cheaper than timezone SQL.
    const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString();

    const [taskRes, totalRes, usageRes, restaurantRes] = await Promise.all([
      admin.rpc("bump_rate_limit", {
        p_key: `ai_${task}:${restaurantId}`,
        p_limit: taskCfg.limit,
        p_window_seconds: taskCfg.windowSeconds,
      }),
      admin.rpc("bump_rate_limit", {
        p_key: `ai_total:${restaurantId}`,
        p_limit: AI_TOTAL.limit,
        p_window_seconds: AI_TOTAL.windowSeconds,
      }),
      admin.from("provider_usage").select("est_cost_usd, created_at").eq("restaurant_id", restaurantId).gte("created_at", since),
      admin.from("restaurants").select("menu_defaults").eq("id", restaurantId).maybeSingle(),
    ]);

    if (taskRes.error || totalRes.error) {
      console.error("AI rate limit check failed (failing open):", taskRes.error ?? totalRes.error);
      return { allowed: true };
    }
    if (taskRes.data !== true) return { allowed: false, reason: "task" };
    if (totalRes.data !== true) return { allowed: false, reason: "total" };

    // Budget ceiling — checked after the count windows so the cheaper guards
    // answer first. Its own failure also fails open (spend protection must
    // never block the morning board over a metering-read hiccup).
    if (usageRes.error) {
      console.error("AI spend ceiling check failed (failing open):", usageRes.error);
      return { allowed: true };
    }
    const timezone =
      ((restaurantRes.data?.menu_defaults as { timezone?: string } | null)?.timezone as string | undefined) ??
      DEFAULT_TIMEZONE;
    const today = localDateKey(new Date(), timezone);
    const spentToday = (usageRes.data ?? [])
      .filter((row) => localDateKey(new Date(row.created_at as string), timezone) === today)
      .reduce((sum, row) => sum + (Number(row.est_cost_usd) || 0), 0);
    if (spentToday >= AI_DAILY_SPEND_CEILING_USD) return { allowed: false, reason: "budget" };

    return { allowed: true };
  } catch (err) {
    console.error("AI rate limit check failed (failing open):", err);
    return { allowed: true };
  }
}

// ---------------------------------------------------------------------------
// Owner visibility for the guards above (2026-07-16, owner's ask: "notify me
// if there's a slow leak or the $5 cap is hit, so I know something is wrong")
// ---------------------------------------------------------------------------

/** Half the daily budget: the honest "slow leak" detector. A leak too slow to reach 50% of a $5 budget is indistinguishable from normal use — the banner starts here and escalates. */
const AI_SPEND_WARN_USD = AI_DAILY_SPEND_CEILING_USD / 2;

export interface AiSpendStatus {
  spentTodayUsd: number;
  ceilingUsd: number;
  /** ≥ 50% of budget — the slow-leak early warning. */
  warn: boolean;
  /** ≥ 100% — AI paused for the day. */
  capped: boolean;
  /** Some ai_* counter is currently OVER its window — requests are being denied RIGHT NOW, i.e. a loop is likely live this hour. */
  activeDenials: boolean;
}

/**
 * Drives the admin-wide alert banner (src/app/admin/layout.tsx). Returns null
 * on any failure — the layout renders every admin screen, and the social-panel
 * incident (CLAUDE.md) is the standing proof that a bolted-on read must never
 * be able to take that page down.
 */
export async function getAiSpendStatus(restaurantId: string): Promise<AiSpendStatus | null> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
    const [usageRes, restaurantRes, countersRes] = await Promise.all([
      admin.from("provider_usage").select("est_cost_usd, created_at").eq("restaurant_id", restaurantId).gte("created_at", since),
      admin.from("restaurants").select("menu_defaults").eq("id", restaurantId).maybeSingle(),
      admin.from("rate_limit_counters").select("key, count").like("key", `ai_%:${restaurantId}`),
    ]);
    if (usageRes.error) throw usageRes.error;

    const timezone =
      ((restaurantRes.data?.menu_defaults as { timezone?: string } | null)?.timezone as string | undefined) ??
      DEFAULT_TIMEZONE;
    const today = localDateKey(new Date(), timezone);
    const spentTodayUsd = (usageRes.data ?? [])
      .filter((row) => localDateKey(new Date(row.created_at as string), timezone) === today)
      .reduce((sum, row) => sum + (Number(row.est_cost_usd) || 0), 0);

    // A counter over its limit means denials are happening in the current
    // window. (Counter rows self-sweep a day after their window starts, so
    // this can only ever reflect recent, real pressure.)
    const activeDenials = (countersRes.data ?? []).some((row) => {
      const key = row.key as string;
      if (key.startsWith("ai_total:")) return (row.count as number) > AI_TOTAL.limit;
      if (key.startsWith("ai_alert:")) return false; // the dedup counter below, not a guard
      const task = key.slice(3, key.indexOf(":"));
      return (row.count as number) > (AI_LIMITS[task]?.limit ?? 20);
    });

    return {
      spentTodayUsd,
      ceilingUsd: AI_DAILY_SPEND_CEILING_USD,
      warn: spentTodayUsd >= AI_SPEND_WARN_USD,
      capped: spentTodayUsd >= AI_DAILY_SPEND_CEILING_USD,
      activeDenials,
    };
  } catch (err) {
    console.error("getAiSpendStatus failed (banner skipped):", err);
    return null;
  }
}

/**
 * Emails the owner when an AI guard actually trips, via the same Netlify
 * Forms channel the Email/Fax form already uses — no new email service, no
 * new dependency; the owner configures one notification in the Netlify UI
 * (Forms → ai-alert). The form is registered by public/__forms.html.
 *
 * **Deduped to one email per rolling day** via the same bump_rate_limit
 * function (`ai_alert` key): the whole point of a guard tripping is that
 * something may be firing hundreds of requests — every one of them reaches
 * this line, and the owner needs one email, not a flooded inbox.
 *
 * Origin comes from Netlify's injected URL var (the promote-schedules
 * pattern), because this runs from resolveTask with no Request in scope.
 * Locally that's NEXT_PUBLIC_SITE_URL or nothing — a skipped/failed send
 * only ever logs; the in-app banner is the channel that works everywhere.
 */
export async function sendAiSpendAlertOnce(restaurantId: string, reason: "task" | "total" | "budget"): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: firstToday, error } = await admin.rpc("bump_rate_limit", {
      p_key: `ai_alert:${restaurantId}`,
      p_limit: 1,
      p_window_seconds: 86400,
    });
    // On dedup-check failure, DON'T send: a broken dedup during a real loop
    // is exactly how an inbox gets flooded — the banner still covers us.
    if (error || firstToday !== true) return;

    const origin = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      console.error("AI spend alert: no site origin available (URL / NEXT_PUBLIC_SITE_URL unset), email skipped");
      return;
    }

    const status = await getAiSpendStatus(restaurantId);
    const body = new URLSearchParams({
      "form-name": "ai-alert",
      alert_type:
        reason === "budget"
          ? "Daily $5 AI spending limit reached"
          : "Unusually many AI requests (possible stuck loop)",
      spent_today: status ? `$${status.spentTodayUsd.toFixed(2)}` : "unknown",
      detail:
        "MyMenuAgent paused its AI features as a precaution. Check Settings → AI Providers (usage dashboard) — if today's numbers surprise you, something may be calling the AI in a loop.",
      happened_at: new Date().toISOString(),
    });

    const res = await fetch(`${origin}/__forms.html`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`AI spend alert email failed (non-blocking): ${res.status}`);
  } catch (err) {
    console.error("AI spend alert failed (non-blocking):", err);
  }
}

/** Returns true if the request is allowed, false if it should get a 429. */
export async function checkPublicRateLimit(scope: RateLimitScope, request: Request): Promise<boolean> {
  try {
    const env = getServerEnv();
    // Reuses the existing server-only secret rather than adding a new env var
    // (Netlify UI + .env.example churn for zero security gain); the
    // "rate-limit:" prefix domain-separates this HMAC use from the secret's
    // AES key derivation in crypto.ts.
    const hash = createHmac("sha256", `rate-limit:${env.PROVIDER_KEY_ENCRYPTION_SECRET}`)
      .update(clientIp(request))
      .digest("hex")
      .slice(0, 32);

    const { limit, windowSeconds } = LIMITS[scope];
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("bump_rate_limit", {
      p_key: `${scope}:${hash}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("rate limit check failed (failing open):", error);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("rate limit check failed (failing open):", err);
    return true;
  }
}
