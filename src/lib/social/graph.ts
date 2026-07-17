/**
 * Thin Meta Graph API client — the only place this app talks to Meta
 * (docs/10). Server-only: every function here handles access tokens, which
 * must never reach a client bundle.
 *
 * Pinned to a Graph version on purpose: Meta's unversioned endpoints silently
 * follow the newest version, so a breaking change upstream would surface as a
 * mystery failure in the owner's Facebook feed. Bumping this is a deliberate,
 * testable act. (v23.0 — current at the time of writing, 2026-07-16.)
 */
const GRAPH_VERSION = "v23.0";
const GRAPH_HOST = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Hard timeout on every Graph call. The post-publish hook runs inside the
 * per-minute cron function (docs/02), so a hanging Meta request must not eat
 * that function's runtime budget — same reasoning as the Netlify Forms notify.
 */
const TIMEOUT_MS = 5000;

export class GraphError extends Error {
  constructor(
    message: string,
    /** Meta's own error code, when it returned one — useful for telling "token dead" (190) from "bad image" (36001 etc). */
    readonly code?: number
  ) {
    super(message);
    this.name = "GraphError";
  }
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_user_msg?: string };
}

/**
 * One Graph request. Tokens go in the Authorization header rather than a
 * `?access_token=` query param — URLs land in proxy/CDN/server access logs,
 * and docs/09 records this exact class of bug being found and fixed in the
 * Gemini adapter. Don't "simplify" this back into the query string.
 */
async function graphFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; token: string; params?: Record<string, string> }
): Promise<T> {
  const url = new URL(`${GRAPH_HOST}${path}`);
  let body: URLSearchParams | undefined;

  if (init.method === "GET") {
    for (const [k, v] of Object.entries(init.params ?? {})) url.searchParams.set(k, v);
  } else {
    body = new URLSearchParams(init.params ?? {});
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${init.token}`,
        ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Network failure or timeout — never a token leak, safe to surface.
    throw new GraphError(err instanceof Error ? `Could not reach Facebook: ${err.message}` : "Could not reach Facebook.");
  }

  const json = (await res.json().catch(() => null)) as (T & GraphErrorBody) | null;
  if (!res.ok || json?.error) {
    const e = json?.error;
    throw new GraphError(e?.error_user_msg || e?.message || `Facebook returned ${res.status}.`, e?.code);
  }
  if (!json) throw new GraphError("Facebook returned an empty response.");
  return json;
}

// ---------------------------------------------------------------------------
// OAuth / token exchange
// ---------------------------------------------------------------------------

/** The scopes this integration needs — see docs/10's table for why each one. */
export const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export function metaAuthorizeUrl(appId: string, redirectUri: string, state: string): string {
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/**
 * Authorization code → short-lived user token. App secret is sent here, so
 * this is server-only by construction (the docs say the same).
 */
export async function exchangeCodeForUserToken(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string
): Promise<string> {
  const url = new URL(`${GRAPH_HOST}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json = (await res.json().catch(() => null)) as ({ access_token?: string } & GraphErrorBody) | null;
  if (!res.ok || !json?.access_token) {
    throw new GraphError(json?.error?.message ?? "Could not complete the Facebook connection.", json?.error?.code);
  }
  return json.access_token;
}

/**
 * Short-lived (~1h) → long-lived (~60d) user token. Only a stepping stone:
 * the Page tokens derived FROM a long-lived user token are the durable
 * credential (they don't expire), which is what we actually store — docs/10.
 */
export async function exchangeForLongLivedUserToken(appId: string, appSecret: string, shortLivedToken: string): Promise<string> {
  const url = new URL(`${GRAPH_HOST}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json = (await res.json().catch(() => null)) as ({ access_token?: string } & GraphErrorBody) | null;
  if (!res.ok || !json?.access_token) {
    throw new GraphError(json?.error?.message ?? "Could not finish the Facebook connection.", json?.error?.code);
  }
  return json.access_token;
}

export interface MetaPage {
  id: string;
  name: string;
  /** The Page access token — the thing worth storing. Non-expiring when derived from a long-lived user token. */
  access_token: string;
}

/** Pages this user administers, each with its Page token. */
export async function listPages(longLivedUserToken: string): Promise<MetaPage[]> {
  const json = await graphFetch<{ data?: MetaPage[] }>("/me/accounts", {
    method: "GET",
    token: longLivedUserToken,
    params: { fields: "id,name,access_token" },
  });
  return json.data ?? [];
}

/**
 * The IG Business account linked to a Page, if any. Returns null when the
 * owner never linked Instagram to the Page — a normal, recoverable state
 * that must be surfaced ("Facebook connected, Instagram not linked"), not
 * treated as a failure.
 */
export async function getLinkedInstagramAccount(
  pageId: string,
  pageToken: string
): Promise<{ id: string; username: string | null } | null> {
  const json = await graphFetch<{ instagram_business_account?: { id: string; username?: string } }>(`/${pageId}`, {
    method: "GET",
    token: pageToken,
    params: { fields: "instagram_business_account{id,username}" },
  });
  const ig = json.instagram_business_account;
  return ig ? { id: ig.id, username: ig.username ?? null } : null;
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/** Facebook Page photo post: one call. `url` is fetched by Meta, so it must be publicly reachable. */
export async function postPhotoToPage(
  pageId: string,
  pageToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const json = await graphFetch<{ id?: string; post_id?: string }>(`/${pageId}/photos`, {
    method: "POST",
    token: pageToken,
    params: { url: imageUrl, message: caption },
  });
  return json.post_id ?? json.id ?? "";
}

/**
 * Instagram publish: two calls by design — create a media container, then
 * publish it (docs/10). Uses the PAGE token, not a separate IG token.
 * `imageUrl` must be a public JPEG within IG's 4:5–1.91:1 ratio window;
 * violating either is a Graph error, not a silent crop.
 */
export async function postPhotoToInstagram(
  igUserId: string,
  pageToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const container = await graphFetch<{ id?: string }>(`/${igUserId}/media`, {
    method: "POST",
    token: pageToken,
    params: { image_url: imageUrl, caption },
  });
  if (!container.id) throw new GraphError("Instagram did not return a media container.");

  const published = await graphFetch<{ id?: string }>(`/${igUserId}/media_publish`, {
    method: "POST",
    token: pageToken,
    params: { creation_id: container.id },
  });
  return published.id ?? "";
}
