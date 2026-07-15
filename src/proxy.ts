import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the "middleware" file convention to "proxy" (same
// behavior, same config.matcher shape) — see AGENTS.md's warning about
// breaking changes vs. training data.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * The marketing site lives at the root and must stay session-free (fast,
     * cacheable, no Supabase round-trip), so the boundary is inverted from
     * the original widget-era setup: only the staff surfaces run the
     * session-refresh/guard middleware.
     * - /admin/*: the staff PWA
     * - /login: the email + password sign-in page
     * - /api/*: authenticated APIs — except /api/public (open by design) and
     *   /api/cron (guarded by its own secret header, not a user session)
     */
    "/admin/:path*",
    "/login",
    "/api/((?!public|cron).*)",
  ],
};
