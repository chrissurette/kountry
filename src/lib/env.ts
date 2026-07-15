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

/** Safe to use from client components. */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
