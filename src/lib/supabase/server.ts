import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads the user's session from cookies, so all queries
 * are subject to RLS as that user — this is the client feature code should
 * default to. Use lib/supabase/admin.ts only for the specific server-only
 * operations documented there (public menu reads, cron promotion, provider
 * key decryption).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll is called from a Server Component in some cases, where
          // cookie writes are a no-op; middleware.ts refreshes the session
          // there instead. Safe to ignore.
        }
      },
    },
  });
}
