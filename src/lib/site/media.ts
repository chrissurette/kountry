import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteMediaKind } from "@/types/database";

/**
 * Public read of staff-uploaded hero/gallery photos for the marketing site.
 * Same "no user session, service-role is correct" reasoning as
 * getLiveMenuPayload/getSiteRestaurant — public pages never carry a session.
 * The site-media bucket is public (docs: separate from the private `assets`
 * bucket), so getPublicUrl returns a stable, unsigned, permanently-cacheable
 * URL — no signing/expiry to manage.
 */
export interface SiteMediaPhoto {
  url: string;
  caption: string | null;
}

export const getSiteMedia = cache(async (restaurantId: string, kind: SiteMediaKind): Promise<SiteMediaPhoto[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_media")
    .select("storage_path, caption")
    .eq("restaurant_id", restaurantId)
    .eq("kind", kind)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getSiteMedia: query failed:", error);
    return [];
  }
  if (!data || data.length === 0) return [];

  return data.map((row) => ({
    url: admin.storage.from("site-media").getPublicUrl(row.storage_path).data.publicUrl,
    caption: row.caption,
  }));
});
