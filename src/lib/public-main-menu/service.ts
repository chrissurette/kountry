import { createAdminClient } from "@/lib/supabase/admin";
import type { MainMenuCategory } from "@/types/database";

export interface PublicMainMenuSection {
  name: string;
  description: string | null;
  nameEs: string | null;
  descriptionEs: string | null;
  category: MainMenuCategory;
  items: {
    name: string;
    description: string | null;
    nameEs: string | null;
    descriptionEs: string | null;
    price_cents: number | null;
    price_note: string | null;
    imageUrl: string | null;
  }[];
}

/**
 * The public read path for the permanent Main Menu — sibling to
 * getLiveMenuPayload (Daily Specials), same "no session, service-role is
 * correct" reasoning. Kept as its own small endpoint/service rather than
 * folded into the Daily Specials payload shape, since that shape still
 * backs History's live preview (ThemeRenderer) and changing it would
 * ripple through that unrelated content type.
 */
export async function getMainMenuForSlug(slug: string): Promise<PublicMainMenuSection[] | null> {
  const admin = createAdminClient();

  const { data: restaurant } = await admin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!restaurant) return null;

  const { data: sections, error } = await admin
    .from("main_menu_sections")
    .select(
      "name, description, name_es, description_es, category, sort_order, main_menu_items(name, description, name_es, description_es, price_cents, price_note, image_path, sort_order)"
    )
    .eq("restaurant_id", restaurant.id)
    .order("sort_order")
    .order("sort_order", { referencedTable: "main_menu_items" });

  if (error) {
    console.error("getMainMenuForSlug: query failed:", error);
    return null;
  }

  return (sections ?? []).map((s) => ({
    name: s.name,
    description: s.description,
    nameEs: s.name_es,
    descriptionEs: s.description_es,
    category: s.category as MainMenuCategory,
    items: (
      (s.main_menu_items as unknown as {
        name: string;
        description: string | null;
        name_es: string | null;
        description_es: string | null;
        price_cents: number | null;
        price_note: string | null;
        image_path: string | null;
      }[]) ?? []
    ).map((item) => ({
      name: item.name,
      description: item.description,
      nameEs: item.name_es,
      descriptionEs: item.description_es,
      price_cents: item.price_cents,
      price_note: item.price_note,
      imageUrl: item.image_path ? admin.storage.from("site-media").getPublicUrl(item.image_path).data.publicUrl : null,
    })),
  }));
}
