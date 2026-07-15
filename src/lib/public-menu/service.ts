import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuSnapshotPayload } from "@/types/database";
import type { Locale } from "@/lib/i18n/locale";

/**
 * The single read path every public surface uses — the site's own /menu
 * page and homepage (direct function call), GET /api/public/{slug}/menu
 * (docs/02, for any future cross-origin consumer), and History's live
 * preview via published_snapshots.payload. No user session exists here, so
 * this is one of the few places the service-role client is correct to use:
 * it resolves restaurants.live_snapshot_id directly, bypassing RLS because
 * there IS no requesting user to scope RLS to.
 */
export async function getLiveMenuPayload(slug: string): Promise<MenuSnapshotPayload | null> {
  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("live_snapshot_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant?.live_snapshot_id) return null;

  const { data: snapshot } = await admin
    .from("published_snapshots")
    .select("payload")
    .eq("id", restaurant.live_snapshot_id)
    .maybeSingle();

  return (snapshot?.payload as MenuSnapshotPayload) ?? null;
}

/** The Daily Special image to show for a given visitor locale (docs/08) — Spanish when the locale is es AND a Spanish render exists, English otherwise. Never null just because a translation is missing. */
export function localizedSpecialsImageUrl(payload: MenuSnapshotPayload | null, locale: Locale): string | null {
  if (!payload) return null;
  if (locale === "es" && payload.menu.imageUrlEs) return payload.menu.imageUrlEs;
  return payload.menu.imageUrl ?? null;
}
