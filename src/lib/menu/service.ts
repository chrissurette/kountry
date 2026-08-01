import type { SupabaseClient } from "@supabase/supabase-js";
import type { Menu, MenuItem, MenuSection } from "@/types/database";

export interface MenuWithContent extends Menu {
  menu_sections: (MenuSection & { menu_items: MenuItem[] })[];
}

export class MenuDeleteBlockedError extends Error {
  constructor() {
    super("Published or scheduled specials are kept in History and cannot be deleted.");
    this.name = "MenuDeleteBlockedError";
  }
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
  const { data: existing, error: readError } = await supabase
    .from("menus")
    .select("status, generated_image_path, generated_image_path_es, social_image_path, social_image_ig_path")
    .eq("id", menuId)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Menu not found.");

  // Published snapshots are immutable and keep pointing at these rendered
  // files forever. Removing one would break History and, for the live
  // snapshot, the public site. Only unpublished drafts are disposable.
  const { data: snapshot, error: snapshotError } = await supabase
    .from("published_snapshots")
    .select("id")
    .eq("menu_id", menuId)
    .limit(1)
    .maybeSingle();
  if (snapshotError) throw snapshotError;
  if (existing.status !== "draft" || snapshot) throw new MenuDeleteBlockedError();

  const paths = [
    existing.generated_image_path,
    existing.generated_image_path_es,
    existing.social_image_path,
    existing.social_image_ig_path,
  ].filter((path): path is string => Boolean(path));

  const { error } = await supabase.from("menus").delete().eq("id", menuId);
  if (error) throw error;

  // Delete the database row first. If Storage cleanup ever fails, the safe
  // failure is an orphaned draft file—not a menu row whose file vanished.
  if (paths.length > 0) await supabase.storage.from("site-media").remove(paths);
}
