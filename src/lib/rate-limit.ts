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
