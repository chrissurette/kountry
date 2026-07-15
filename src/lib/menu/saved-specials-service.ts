import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { MenuStatus } from "@/types/database";

const BUCKET = "site-media";

export interface SavedSpecial {
  id: string;
  imageUrl: string;
  status: MenuStatus;
  dateText: string | null;
  createdAt: string;
  isLive: boolean;
}

/**
 * Every Daily Special that has been *rendered* (has a generated_image_path)
 * — the repurposed Library / "Saved Specials" collection. Includes drafts
 * (rendered but not yet published) and published ones, so nothing a user made
 * is ever lost: they can re-open any of them to edit or re-publish.
 */
export async function listSavedSpecials(supabase: SupabaseClient): Promise<SavedSpecial[]> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  // Which menu is currently live (to badge it)?
  let liveMenuId: string | null = null;
  const { data: rest } = await supabase.from("restaurants").select("live_snapshot_id").eq("id", restaurantId).maybeSingle();
  if (rest?.live_snapshot_id) {
    const { data: snap } = await supabase.from("published_snapshots").select("menu_id").eq("id", rest.live_snapshot_id).maybeSingle();
    liveMenuId = (snap?.menu_id as string | undefined) ?? null;
  }

  const { data, error } = await supabase
    .from("menus")
    .select("id, status, special_data, generated_image_path, created_at")
    .eq("restaurant_id", restaurantId)
    .not("generated_image_path", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((m) => ({
    id: m.id as string,
    imageUrl: supabase.storage.from(BUCKET).getPublicUrl(m.generated_image_path as string).data.publicUrl,
    status: m.status as MenuStatus,
    dateText: (m.special_data as { menu?: { dateText?: string | null } } | null)?.menu?.dateText ?? null,
    createdAt: m.created_at as string,
    isLive: (m.id as string) === liveMenuId,
  }));
}

/**
 * The most recent unpublished draft that has structured data — used by the
 * New Daily Special screen to offer "resume in progress" so an extracted (or
 * rendered-but-unpublished) special isn't lost when the owner navigates away.
 */
export async function getLatestDraft(supabase: SupabaseClient): Promise<{ id: string; hasImage: boolean } | null> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data } = await supabase
    .from("menus")
    .select("id, generated_image_path")
    .eq("restaurant_id", restaurantId)
    .eq("status", "draft")
    .not("special_data", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, hasImage: Boolean(data.generated_image_path) };
}
