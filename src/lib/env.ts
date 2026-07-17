import { z } from "zod";

/**
 * Centralized, validated env access. Import from here instead of reading
 * `process.env.*` directly so a missing var fails fast with a clear message
 * instead of surfacing as a confusing runtime error deep in a request.
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PROVIDER_KEY_ENCRYPTION_SECRET: z.string().min(32, {
    message:
      "PROVIDER_KEY_ENCRYPTION_SECRET must be at least 32 bytes (base64 or hex) — used to encrypt owner-supplied AI provider keys at rest.",
  }),
  CRON_SECRET: z.string().min(1),
  // Meta (Facebook/Instagram) auto-publishing — docs/10.
  // **Deliberately optional, and it must stay that way.** getServerEnv()
  // throws on any schema failure, and it's called on nearly every server
  // path (crypto, cron, providers) — making these required would take the
  // whole app down until the owner finishes creating their Meta app. The
  // feature reads them via metaAppCredentials() below and degrades to
  // "not configured" in Settings when absent.
  META_APP_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/** Server-only env (includes secrets). Never import this from client components. */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid/missing environment variables: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}. See .env.example.`
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/**
 * The Meta app credentials, or null when the owner hasn't set them up yet
 * (docs/10's checklist step 5). Callers MUST handle null rather than assume —
 * that's what keeps social publishing an inert, invisible feature until it's
 * configured, instead of a source of 500s.
 */
export function metaAppCredentials(): { appId: string; appSecret: string } | null {
  const env = getServerEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET) return null;
  return { appId: env.META_APP_ID, appSecret: env.META_APP_SECRET };
}

/** Safe to use from client components. */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
