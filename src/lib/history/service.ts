import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { PublishedSnapshot } from "@/types/database";

/** Every published menu, newest first — the archive (docs/03: "view and one-tap re-publish"). */
export async function listSnapshots(supabase: SupabaseClient): Promise<PublishedSnapshot[]> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("published_snapshots")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data as PublishedSnapshot[];
}

/**
 * One-tap re-publish: point live_snapshot_id at an already-immutable past
 * snapshot — no new snapshot needed, it's just a pointer flip (docs/02).
 */
export async function republishSnapshot(supabase: SupabaseClient, snapshotId: string): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  // Confirms the snapshot actually belongs to this restaurant (RLS would
  // block a cross-restaurant read anyway, but this makes the check explicit
  // before the update rather than relying solely on the update's own RLS).
  const { data: snapshot, error: snapshotError } = await supabase
    .from("published_snapshots")
    .select("id")
    .eq("id", snapshotId)
    .eq("restaurant_id", restaurantId)
    .single();
  if (snapshotError) throw snapshotError;

  const { error } = await supabase.from("restaurants").update({ live_snapshot_id: snapshot.id }).eq("id", restaurantId);
  if (error) throw error;
}
