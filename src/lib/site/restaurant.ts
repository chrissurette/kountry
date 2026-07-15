import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Restaurant } from "@/types/database";

/**
 * Public-safe subset of the restaurant profile for the marketing site.
 * Explicit allowlist (same discipline as public-menu/service.ts) — never
 * serialize the whole row into a public page even though today's columns
 * happen to be harmless.
 */
export type SiteRestaurant = Pick<
  Restaurant,
  | "id"
  | "slug"
  | "name"
  | "address"
  | "phone"
  | "email"
  | "hours"
  | "social"
  | "brand"
  | "menu_defaults"
  | "live_snapshot_id"
>;

const SITE_FIELDS =
  "id, slug, name, address, phone, email, hours, social, brand, menu_defaults, live_snapshot_id";

/**
 * Resolves which restaurant this deployment's public site belongs to.
 * Per the multi-tenant rule (docs/03: adding a restaurant is a row, never a
 * code change), the selection is configuration: set SITE_RESTAURANT_SLUG in
 * the environment. With a single restaurant row (today's reality) the env
 * var is optional — the sole row wins.
 *
 * No user session exists on public pages, so the service-role read here is
 * correct for the same reason as getLiveMenuPayload (docs/02's public path).
 * React cache() dedupes across layout + page within one request.
 */
export const getSiteRestaurant = cache(async (): Promise<SiteRestaurant | null> => {
  const admin = createAdminClient();
  const slug = process.env.SITE_RESTAURANT_SLUG;

  if (slug) {
    const { data, error } = await admin
      .from("restaurants")
      .select(SITE_FIELDS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) console.error("getSiteRestaurant: slug lookup failed:", error);
    return (data as SiteRestaurant | null) ?? null;
  }

  const { data, error } = await admin.from("restaurants").select(SITE_FIELDS).limit(2);
  if (error) {
    console.error("getSiteRestaurant: lookup failed:", error);
    return null;
  }
  if (!data || data.length === 0) return null;
  if (data.length > 1) {
    console.error(
      "getSiteRestaurant: multiple restaurants exist — set SITE_RESTAURANT_SLUG to pick which one this site serves."
    );
    return null;
  }
  return data[0] as SiteRestaurant;
});
