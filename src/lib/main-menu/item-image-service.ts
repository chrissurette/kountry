import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";

const BUCKET = "site-media";

export interface MenuItemImageUploadTarget {
  path: string;
  token: string;
  signedUrl: string;
}

class MenuItemNotFoundError extends Error {
  constructor() {
    super("Menu item not found.");
  }
}

async function getOwnedItem(supabase: SupabaseClient, itemId: string, restaurantId: string) {
  const { data, error } = await supabase
    .from("main_menu_items")
    .select("id, image_path")
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new MenuItemNotFoundError();
  return data;
}

/** Same signed-upload-URL pattern as site-media/service.ts — one photo per item, so a new upload replaces the prior one. */
export async function createMenuItemImageUploadTarget(
  supabase: SupabaseClient,
  itemId: string,
  ext: string
): Promise<MenuItemImageUploadTarget> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const item = await getOwnedItem(supabase, itemId, restaurantId);

  if (item.image_path) {
    await supabase.storage.from(BUCKET).remove([item.image_path]);
  }

  const path = `${restaurantId}/menu-items/${randomUUID()}.${ext}`;
  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signError) throw signError;

  const { error: updateError } = await supabase.from("main_menu_items").update({ image_path: path }).eq("id", itemId);
  if (updateError) throw updateError;

  return { path, token: signed.token, signedUrl: signed.signedUrl };
}

export async function deleteMenuItemImage(supabase: SupabaseClient, itemId: string): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const item = await getOwnedItem(supabase, itemId, restaurantId);
  if (!item.image_path) return;

  await supabase.storage.from(BUCKET).remove([item.image_path]);
  const { error } = await supabase.from("main_menu_items").update({ image_path: null }).eq("id", itemId);
  if (error) throw error;
}

export { MenuItemNotFoundError };
