import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS entirely — restrict its use to:
 *   - the public menu read path (GET /api/public/{slug}/menu), which has no
 *     user session to check RLS against and must only ever read
 *     restaurants.live_snapshot_id's payload;
 *   - the cron schedule-promotion endpoint;
 *   - provider-credential encryption/decryption inside the provider adapter layer.
 * Never import this into a Server Component or any code path that serializes
 * a full row into a client-facing response without an explicit allowlist of
 * fields (see ProviderCredential in src/types/database.ts).
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
