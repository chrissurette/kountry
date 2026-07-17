export const META_STATE_COOKIE = "meta_oauth_state";

/**
 * The OAuth redirect URI, derived from the incoming request rather than
 * NEXT_PUBLIC_SITE_URL — that var is documented as not set on Netlify
 * (CLAUDE.md), and getting this wrong doesn't fail loudly: Meta rejects any
 * redirect_uri that doesn't exactly match one registered in the app's
 * Facebook Login settings, so a localhost URL leaking into production would
 * break the connect with an opaque Meta error.
 *
 * Must match a "Valid OAuth Redirect URI" in the Meta app dashboard exactly,
 * including scheme and path (docs/10's checklist step 2).
 */
export function metaRedirectUri(request: Request): string {
  return `${new URL(request.url).origin}/api/social/meta/callback`;
}
