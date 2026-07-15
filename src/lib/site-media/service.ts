import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { SiteMedia } from "@/types/database";
import type { CreateSiteMediaInput } from "./schema";

const BUCKET = "site-media";

export interface SiteMediaUploadTarget {
  id: string;
  path: string;
  token: string;
  signedUrl: string;
}

/**
 * Issues a signed Storage upload URL and creates the site_media row — same
 * "session-scoped client enforces the RLS path" pattern as
 * src/lib/uploads/service.ts. A hero is singular (one photo shown on the
 * homepage), so uploading a new one replaces the prior hero rather than
 * accumulating; gallery photos simply accumulate.
 */
export async function createSiteMediaUploadTarget(
  supabase: SupabaseClient,
  input: CreateSiteMediaInput
): Promise<SiteMediaUploadTarget> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  if (input.kind === "hero") {
    await deleteAllOfKind(supabase, restaurantId, "hero");
  }

  const id = randomUUID();
  const path = `${restaurantId}/${input.kind}/${id}.${input.ext}`;

  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signError) throw signError;

  const { data: countRow } = await supabase
    .from("site_media")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .eq("kind", input.kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (countRow?.sort_order ?? -1) + 1;

  const { error: insertError } = await supabase.from("site_media").insert({
    id,
    restaurant_id: restaurantId,
    kind: input.kind,
    storage_path: path,
    sort_order: nextSortOrder,
  });
  if (insertError) throw insertError;

  return { id, path, token: signed.token, signedUrl: signed.signedUrl };
}

export async function listSiteMedia(supabase: SupabaseClient, kind?: SiteMedia["kind"]): Promise<SiteMedia[]> {
  let query = supabase.from("site_media").select("*").order("sort_order", { ascending: true });
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data as SiteMedia[]) ?? [];
}

export async function updateSiteMediaCaption(supabase: SupabaseClient, id: string, caption: string | null): Promise<void> {
  const { error } = await supabase.from("site_media").update({ caption }).eq("id", id);
  if (error) throw error;
}

export async function deleteSiteMedia(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from("site_media")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) return;

  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  const { error: deleteError } = await supabase.from("site_media").delete().eq("id", id);
  if (deleteError) throw deleteError;
}

async function deleteAllOfKind(supabase: SupabaseClient, restaurantId: string, kind: SiteMedia["kind"]): Promise<void> {
  const { data: rows } = await supabase
    .from("site_media")
    .select("id, storage_path")
    .eq("restaurant_id", restaurantId)
    .eq("kind", kind);
  if (!rows || rows.length === 0) return;

  await supabase.storage.from(BUCKET).remove(rows.map((r) => r.storage_path));
  await supabase
    .from("site_media")
    .delete()
    .in(
      "id",
      rows.map((r) => r.id)
    );
}
