import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import type { MainMenuSection, MainMenuItem } from "@/types/database";
import type { MainMenuPatchInput } from "./schema";

export interface MainMenuWithContent {
  sections: (MainMenuSection & { main_menu_items: MainMenuItem[] })[];
}

/** The permanent Main Menu (docs: hand-typed, always live, no publish step) — separate from the Daily Specials pipeline in src/lib/menu. */
export async function getMainMenu(supabase: SupabaseClient): Promise<MainMenuWithContent> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { data, error } = await supabase
    .from("main_menu_sections")
    .select("*, main_menu_items(*)")
    .eq("restaurant_id", restaurantId)
    .order("sort_order")
    .order("sort_order", { referencedTable: "main_menu_items" });
  if (error) throw error;
  return { sections: (data as unknown as MainMenuWithContent["sections"]) ?? [] };
}

/** Atomic replace via the replace_main_menu() RPC (see supabase/migrations) — one transaction, since supabase-js has no multi-statement client transaction. */
export async function replaceMainMenu(supabase: SupabaseClient, patch: MainMenuPatchInput): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { error } = await supabase.rpc("replace_main_menu", {
    p_restaurant_id: restaurantId,
    p_sections: patch.sections,
  });
  if (error) throw error;
}
