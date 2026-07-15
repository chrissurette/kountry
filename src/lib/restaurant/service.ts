import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant } from "@/types/database";
import { getRestaurantIdOrThrow, NoRestaurantError } from "@/lib/auth/restaurant-id";
import type { RestaurantPatchInput } from "./schema";

/**
 * Restaurant profile reads/writes, shared by the /api/restaurant route handler
 * and the Settings screen's server action so both go through one code path
 * (docs/04-api-surface.md, docs/06-pwa-modules.md). Takes the caller's
 * session-scoped Supabase client so RLS (restaurant_members) is always the
 * enforcement boundary — there is no restaurant_id parameter to get wrong.
 */

export { NoRestaurantError };

export async function getRestaurantProfile(supabase: SupabaseClient): Promise<Restaurant> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase.from("restaurants").select("*").eq("id", restaurantId).single();
  if (error) throw error;
  return data as Restaurant;
}

export async function updateRestaurantProfile(
  supabase: SupabaseClient,
  patch: RestaurantPatchInput
): Promise<Restaurant> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  const { data, error } = await supabase
    .from("restaurants")
    .update(patch)
    .eq("id", restaurantId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Restaurant;
}
