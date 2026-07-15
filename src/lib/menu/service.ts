import type { SupabaseClient } from "@supabase/supabase-js";
import type { Menu, MenuItem, MenuSection } from "@/types/database";

export interface MenuWithContent extends Menu {
  menu_sections: (MenuSection & { menu_items: MenuItem[] })[];
}

export async function getMenuWithContent(supabase: SupabaseClient, menuId: string): Promise<MenuWithContent> {
  const { data, error } = await supabase
    .from("menus")
    .select("*, menu_sections(*, menu_items(*))")
    .eq("id", menuId)
    .order("sort_order", { referencedTable: "menu_sections" })
    .order("sort_order", { referencedTable: "menu_sections.menu_items" })
    .single();
  if (error) throw error;
  return data as unknown as MenuWithContent;
}

export async function deleteMenu(supabase: SupabaseClient, menuId: string): Promise<void> {
  // Remove the rendered artifact from Storage first so deleting a saved
  // special (Library) doesn't orphan its .svg in the site-media bucket.
  const { data: existing } = await supabase.from("menus").select("generated_image_path").eq("id", menuId).maybeSingle();
  const path = (existing as Pick<Menu, "generated_image_path"> | null)?.generated_image_path;
  if (path) await supabase.storage.from("site-media").remove([path]);

  const { error } = await supabase.from("menus").delete().eq("id", menuId);
  if (error) throw error;
}
