import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { CustomImageStyle } from "@/types/database";

export async function listCustomStyles(supabase: SupabaseClient): Promise<CustomImageStyle[]> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("custom_image_styles")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CustomImageStyle[]) ?? [];
}

export async function createCustomStyle(
  supabase: SupabaseClient,
  input: { name: string; prompt_fragment: string }
): Promise<CustomImageStyle> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("custom_image_styles")
    .insert({ restaurant_id: restaurantId, name: input.name, prompt_fragment: input.prompt_fragment })
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomImageStyle;
}

export async function deleteCustomStyle(supabase: SupabaseClient, id: string): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { error } = await supabase.from("custom_image_styles").delete().eq("id", id).eq("restaurant_id", restaurantId);
  if (error) throw error;
}
