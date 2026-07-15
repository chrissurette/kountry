import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login"];

// Employees can ONLY reach the Daily Special generator: /admin/menus/* (New
// Daily Special + Review & Publish) and the APIs that flow drives. Everything
// else under /admin and every other authenticated /api is owner-only.
const EMPLOYEE_ALLOWED_PREFIXES = ["/admin/menus", "/api/menus", "/api/uploads", "/api/schedules"];

function isEmployeeAllowed(pathname: string): boolean {
  // Bare /admin just redirects to /admin/menus/new, so let it through.
  if (pathname === "/admin" || pathname === "/admin/") return true;
  return EMPLOYEE_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth session and redirects unauthenticated users
 * away from protected routes. Only staff surfaces are matched at all — the
 * public marketing site, /api/public, and /api/cron are excluded in
 * src/proxy.ts's matcher, so they never pay this cost.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in — /login should go straight into the staff tool.
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Role gate: an 'employee' member is confined to the Daily Special generator.
  // (Owner and any not-yet-linked user pass through unrestricted.)
  if (user && !isPublicPath && !isEmployeeAllowed(pathname)) {
    const { data: member } = await supabase
      .from("restaurant_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (member?.role === "employee") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Not allowed for this account." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin/menus/new", request.url));
    }
  }

  return response;
}
