import type { SupabaseClient } from "@supabase/supabase-js";

export class NoRestaurantError extends Error {
  constructor() {
    super("No restaurant is linked to the current user.");
    this.name = "NoRestaurantError";
  }
}

/** Resolves the signed-in user's restaurant_id from their session-scoped Supabase client. Shared by every service that scopes writes to "the current restaurant" (single-owner today; see docs/03's multi-tenant seam). */
export async function getRestaurantIdOrThrow(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new NoRestaurantError();

  const { data: membership, error } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getRestaurantIdOrThrow: restaurant_members query failed:", error);
  }
  if (!membership) throw new NoRestaurantError();
  return membership.restaurant_id as string;
}
