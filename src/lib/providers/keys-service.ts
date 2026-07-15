import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { encryptProviderKey, decryptProviderKey, last4 } from "./crypto";
import { buildAdapter } from "./registry";
import { ProviderError } from "./types";
import type { ProviderCredential, ProviderId } from "@/types/database";

const TEST_MODEL: Record<ProviderId, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  xai: "grok-4",
};

/**
 * Credential CRUD. Every select is scoped to an explicit column list that
 * excludes encrypted_key — see the SECURITY note in
 * supabase/migrations/..._providers.sql. This module is the only place
 * outside src/lib/providers/registry.ts allowed to touch the ciphertext
 * column, and it never returns it to a caller.
 */

const PUBLIC_COLUMNS = "id, restaurant_id, provider, key_last4, status, created_at";

export async function listCredentials(supabase: SupabaseClient): Promise<ProviderCredential[]> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("provider_credentials")
    .select(PUBLIC_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as ProviderCredential[];
}

export async function upsertCredential(
  supabase: SupabaseClient,
  provider: ProviderId,
  apiKey: string
): Promise<ProviderCredential> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("provider_credentials")
    .upsert(
      {
        restaurant_id: restaurantId,
        provider,
        encrypted_key: encryptProviderKey(apiKey),
        key_last4: last4(apiKey),
        status: "active",
      },
      { onConflict: "restaurant_id,provider" }
    )
    .select(PUBLIC_COLUMNS)
    .single();
  if (error) throw error;
  return data as ProviderCredential;
}

export async function deleteCredential(supabase: SupabaseClient, id: string): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { error } = await supabase
    .from("provider_credentials")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

/** Makes one cheap real call to confirm the stored key actually works, updating status accordingly. */
export async function testCredential(supabase: SupabaseClient, id: string): Promise<"active" | "invalid"> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data: row, error } = await supabase
    .from("provider_credentials")
    .select("provider, encrypted_key")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error) throw error;

  let status: "active" | "invalid" = "active";
  const provider = row.provider as ProviderId;
  const adapter = buildAdapter(provider, decryptProviderKey(row.encrypted_key));
  try {
    // A 1x1 transparent PNG — cheapest possible real round trip to confirm auth works.
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );
    await adapter.vision!.parseMenu({ bytes: new Uint8Array(pixel), mimeType: "image/png" }, { model: TEST_MODEL[provider] });
  } catch (err) {
    status = err instanceof ProviderError && err.code === "auth_invalid" ? "invalid" : "active";
    if (status === "active") throw err; // a non-auth error tells us nothing about key validity; surface it
  }

  const { error: updateError } = await supabase
    .from("provider_credentials")
    .update({ status })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (updateError) throw updateError;

  return status;
}
