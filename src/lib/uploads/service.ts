import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { CreateUploadInput } from "./schema";

const BUCKET = "assets";

export interface UploadTarget {
  assetId: string;
  path: string;
  token: string;
  signedUrl: string;
}

/**
 * Issues a signed Storage upload URL and creates the corresponding assets
 * row. Uses the caller's session-scoped client so the Storage insert policy
 * (docs/03, supabase/migrations/..._storage.sql) enforces that the path's
 * restaurant_id matches the caller — same "RLS is the boundary" pattern as
 * every other service in this app.
 */
export async function createUploadTarget(supabase: SupabaseClient, input: CreateUploadInput): Promise<UploadTarget> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const assetId = randomUUID();
  const path = `${restaurantId}/${input.kind}/${assetId}.${input.ext}`;

  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signError) throw signError;

  const { error: insertError } = await supabase.from("assets").insert({
    id: assetId,
    restaurant_id: restaurantId,
    kind: input.kind,
    storage_path: path,
    mime: input.ext === "png" ? "image/png" : input.ext === "webp" ? "image/webp" : "image/jpeg",
  });
  if (insertError) throw insertError;

  return { assetId, path, token: signed.token, signedUrl: signed.signedUrl };
}
