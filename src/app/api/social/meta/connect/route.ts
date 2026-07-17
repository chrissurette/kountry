import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { metaAppCredentials } from "@/lib/env";
import { metaAuthorizeUrl } from "@/lib/social/graph";
import { META_STATE_COOKIE, metaRedirectUri } from "../shared";

/**
 * Starts the Meta connect (docs/10). A GET that redirects, because it's the
 * target of a plain link in Settings — the owner's browser has to leave for
 * facebook.com, which a fetch() can't do.
 *
 * Owner-only: `/api/social` isn't in the employee allowlist
 * (src/lib/supabase/middleware.ts), so an employee gets 403 before reaching
 * this, and publish_targets' RLS is owner-only regardless.
 */
export async function GET(request: Request) {
  const creds = metaAppCredentials();
  if (!creds) {
    // The owner hasn't set META_APP_ID/SECRET yet. Settings already hides the
    // button in this state; this is the direct-URL guard.
    return NextResponse.redirect(new URL("/admin/settings?social=not_configured", request.url));
  }

  // CSRF: a nonce echoed back by Meta and matched against an httpOnly cookie.
  // Without it, an attacker could hand the owner a callback URL carrying THEIR
  // authorization code and quietly attach their Facebook Page to this account.
  const state = randomBytes(32).toString("hex");

  const response = NextResponse.redirect(metaAuthorizeUrl(creds.appId, metaRedirectUri(request), state));
  response.cookies.set(META_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax", // must survive the top-level redirect back from facebook.com
    secure: new URL(request.url).protocol === "https:",
    path: "/api/social/meta",
    maxAge: 600, // 10 minutes is plenty to click through a consent dialog
  });
  return response;
}
