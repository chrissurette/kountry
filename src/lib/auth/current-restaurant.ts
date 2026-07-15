import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/types/database";

/**
 * Resolves the signed-in user's restaurant. Single-owner today (one
 * restaurant_members row per user), but written against the
 * restaurant_members join table so multi-tenant (a user picking among
 * several restaurants) is an additive change, not a rewrite — see docs/03.
 */
export async function getCurrentRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("getCurrentRestaurant: restaurant_members query failed:", membershipError);
  }
  if (!membership) return null;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", membership.restaurant_id)
    .single();

  if (restaurantError) {
    console.error("getCurrentRestaurant: restaurants query failed:", restaurantError);
  }

  return (restaurant as Restaurant) ?? null;
}
