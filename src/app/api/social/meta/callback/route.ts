import { NextResponse } from "next/server";
import { metaAppCredentials } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForUserToken, exchangeForLongLivedUserToken, listPages } from "@/lib/social/graph";
import { saveMetaConnection } from "@/lib/social/targets-service";
import { META_STATE_COOKIE, metaRedirectUri } from "../shared";

/** Back to Settings with a flag the panel turns into a human message — never a raw Meta error in the URL. */
function settingsRedirect(request: Request, status: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/admin/settings?social=${status}`, request.url));
  response.cookies.delete(META_STATE_COOKIE);
  return response;
}

/**
 * Where Facebook sends the owner back after the consent dialog (docs/10).
 * Everything here is server-side: the app secret is used for the code
 * exchange, and the Page token that comes back is encrypted before it touches
 * the database — neither ever reaches the browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // The owner clicked "Cancel" in Facebook's dialog — not an error.
  if (url.searchParams.get("error")) return settingsRedirect(request, "cancelled");

  // CSRF check: the state we minted in /connect must come back unchanged. A
  // timing-safe compare isn't needed for a random nonce equality test, but the
  // check itself is load-bearing — without it an attacker could bind their own
  // Facebook Page to this restaurant's account.
  const expected = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${META_STATE_COOKIE}=`))
    ?.slice(META_STATE_COOKIE.length + 1);
  if (!code || !state || !expected || state !== expected) {
    return settingsRedirect(request, "invalid_state");
  }

  const creds = metaAppCredentials();
  if (!creds) return settingsRedirect(request, "not_configured");

  try {
    // Session-scoped client: RLS (publish_targets_owner_only) is the real
    // authorization boundary for the write, exactly as everywhere else.
    const supabase = await createClient();

    const shortLived = await exchangeCodeForUserToken(creds.appId, creds.appSecret, metaRedirectUri(request), code);
    const longLived = await exchangeForLongLivedUserToken(creds.appId, creds.appSecret, shortLived);

    const pages = await listPages(longLived);
    if (pages.length === 0) return settingsRedirect(request, "no_pages");
    // Kountry Kitchen administers exactly one Page, so auto-select is right
    // and a picker would be ceremony. If the owner ever admins several, this
    // silently takes the first — that's the point to build a picker (docs/10),
    // not to guess.
    const page = pages[0];

    const { igConnected } = await saveMetaConnection(supabase, page);
    // The long-lived USER token is deliberately dropped here: the Page token
    // it produced doesn't expire, so keeping a second credential around would
    // be pure liability (docs/10).
    return settingsRedirect(request, igConnected ? "connected" : "connected_no_ig");
  } catch (err) {
    console.error("Meta connect failed:", err);
    return settingsRedirect(request, "failed");
  }
}
