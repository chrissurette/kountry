import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { getMenuWithContent } from "@/lib/menu/service";
import { buildMenuSnapshotPayload } from "@/lib/themes/build-payload";
import { createAdminClient } from "@/lib/supabase/admin";
import { postToSocialTargets } from "@/lib/social/targets-service";
import type { MenuDefaults, PublishedSnapshot, PublishSchedule, Restaurant, Theme } from "@/types/database";

/** Every ISR'd public surface fed by the live snapshot — revalidated on-demand so a publish shows up immediately instead of waiting out the 60s window. */
export function revalidatePublicMenuSurfaces(): void {
  revalidatePath("/");
  revalidatePath("/menu");
}

const DEFAULT_TIMEZONE = "America/New_York";

/** "YYYY-MM-DD" for the given instant in the given IANA timezone (en-CA yields ISO date order). */
function localDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/**
 * Auto-clears any live Daily Special that went live on a previous calendar day
 * (in the restaurant's timezone) — so "today's special" always clears itself
 * at local midnight and the site falls back to the hero/placeholder until the
 * owner publishes a new one. Called every minute by the promote-schedules cron
 * (after promoting due schedules); the first tick past midnight clears it.
 * The snapshot/menu are untouched — they stay in History and the Library and
 * can be re-published. Uses `live_since`, falling back to the snapshot's
 * `published_at` for specials that went live before this field existed.
 */
export async function clearStaleLiveSpecials(admin: SupabaseClient): Promise<number> {
  const { data: restaurants } = await admin
    .from("restaurants")
    .select("id, live_snapshot_id, live_since, menu_defaults")
    .not("live_snapshot_id", "is", null);

  const now = new Date();
  let cleared = 0;

  for (const r of restaurants ?? []) {
    const timezone = (r.menu_defaults as MenuDefaults | null)?.timezone ?? DEFAULT_TIMEZONE;

    let wentLive = r.live_since as string | null;
    if (!wentLive) {
      const { data: snap } = await admin
        .from("published_snapshots")
        .select("published_at")
        .eq("id", r.live_snapshot_id as string)
        .maybeSingle();
      wentLive = (snap?.published_at as string | undefined) ?? null;
    }
    if (!wentLive) continue;

    if (localDateKey(new Date(wentLive), timezone) < localDateKey(now, timezone)) {
      await admin.from("restaurants").update({ live_snapshot_id: null, live_since: null }).eq("id", r.id);
      revalidatePublicMenuSurfaces();
      cleared++;
    }
  }

  return cleared;
}

/** For the Publish screen: is there already a pending schedule for this menu? Drives "show schedule form" vs. "show pending schedule + cancel". */
export async function getPendingScheduleForMenu(supabase: SupabaseClient, menuId: string): Promise<PublishSchedule | null> {
  const { data } = await supabase
    .from("publish_schedules")
    .select("*, published_snapshots!inner(menu_id)")
    .eq("published_snapshots.menu_id", menuId)
    .eq("status", "pending")
    .maybeSingle();
  return (data as unknown as PublishSchedule) ?? null;
}

const DEFAULT_THEME_KEY = "classic";

/**
 * Legacy `themes` lookup — tolerant of a missing row. The `themes` table is
 * vestigial for image/SVG-based specials (styling is baked into the rendered
 * artifact; the public site renders `payload.menu.imageUrl`), and a fresh
 * project may never have run seed_themes.sql. Returns null when there's no
 * matching row so publish can proceed with a synthetic theme instead of
 * throwing (which is what blocked SVG-special publishing before 2026-07-16).
 */
export async function getThemeForMenu(supabase: SupabaseClient, themeId: string | null): Promise<Theme | null> {
  const query = themeId
    ? supabase.from("themes").select("*").eq("id", themeId).maybeSingle()
    : supabase.from("themes").select("*").eq("key", DEFAULT_THEME_KEY).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return (data as Theme) ?? null;
}

/** Resolves everything needed to freeze a snapshot and inserts it — shared by publish-now and schedule-creation (docs/02). Does NOT flip the live pointer or touch menu status; callers decide that. */
async function createSnapshot(
  supabase: SupabaseClient,
  menuId: string
): Promise<{ snapshot: PublishedSnapshot; restaurantId: string }> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const menu = await getMenuWithContent(supabase, menuId);
  const theme = await getThemeForMenu(supabase, menu.theme_id);

  const { data: restaurantRow, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .single();
  if (restaurantError) throw restaurantError;
  const restaurant = restaurantRow as Restaurant;

  const imageUrl = menu.generated_image_path
    ? supabase.storage.from("site-media").getPublicUrl(menu.generated_image_path).data.publicUrl
    : null;
  const imageUrlEs = menu.generated_image_path_es
    ? supabase.storage.from("site-media").getPublicUrl(menu.generated_image_path_es).data.publicUrl
    : null;
  // Social JPEGs (docs/10) resolved to public URLs here and frozen into the
  // snapshot: Meta fetches these URLs itself, and a scheduled publish fires
  // from a cron with no browser to compose them later.
  const publicUrl = (path: string | null | undefined) =>
    path ? supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl : null;
  const socialImages = {
    imageUrl: publicUrl(menu.social_image_path),
    imageIgUrl: publicUrl(menu.social_image_ig_path),
  };
  // Synthetic fallback when no legacy themes row exists — the public site
  // renders imageUrl, so theme.key/config here are only vestigial snapshot metadata.
  const themePayload = theme ?? { key: DEFAULT_THEME_KEY, config: {} };
  const payload = buildMenuSnapshotPayload(restaurant, menu, themePayload, undefined, imageUrl, imageUrlEs, socialImages);

  const { data: snapshot, error: snapshotError } = await supabase
    .from("published_snapshots")
    .insert({
      restaurant_id: restaurantId,
      menu_id: menuId,
      payload,
      theme_id: theme?.id ?? null,
      published_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (snapshotError) throw snapshotError;

  // Only persist a theme_id on the menu when it's a real themes row (FK).
  if (theme && menu.theme_id !== theme.id) {
    await supabase.from("menus").update({ theme_id: theme.id }).eq("id", menuId);
  }

  return { snapshot: snapshot as PublishedSnapshot, restaurantId };
}

/**
 * Publish now (docs/02: snapshot + pointer flip, no redeploy). Uses the
 * caller's session-scoped client so RLS (restaurants_update_member,
 * published_snapshots_insert_member) is the enforcement boundary for both
 * the insert and the pointer flip.
 */
export async function publishMenuNow(supabase: SupabaseClient, menuId: string): Promise<PublishedSnapshot> {
  const { snapshot, restaurantId } = await createSnapshot(supabase, menuId);

  // The pointer flip is a service-role write since 2026-07-16, and this is the
  // one place in the app where that's load-bearing rather than incidental:
  // `restaurants` UPDATE is now owner-only at the DB layer (migration ..033,
  // so an employee can't edit the public profile straight from dev tools) —
  // but publishing IS an employee's job (docs/04's role gate allows it), and
  // publishing means updating live_snapshot_id on this very row. Column-level
  // RLS doesn't exist, so "employees may write these two columns and no
  // others" can't be a policy; it has to be expressed in code.
  //
  // Still safely scoped, and NOT a hole: `restaurantId` came from
  // getRestaurantIdOrThrow() on the SESSION client just above (so a caller
  // can only ever target their own restaurant), `snapshot` was created under
  // RLS with that same session client, and the route itself is behind the
  // middleware's auth + role gate. This is exactly what the scheduled-publish
  // path (api/cron/promote-schedules) has always done.
  //
  // Note this narrows an older docs/02 claim that "RLS is the enforcement
  // boundary for both the insert and the pointer flip" — the insert still is;
  // the flip is now enforced by the session-scoped restaurant resolution.
  const { error: flipError } = await createAdminClient()
    .from("restaurants")
    // live_since drives the midnight auto-clear (clearStaleLiveSpecials).
    .update({ live_snapshot_id: snapshot.id, live_since: new Date().toISOString() })
    .eq("id", restaurantId);
  if (flipError) throw flipError;

  await supabase.from("menus").update({ status: "published" }).eq("id", menuId);

  // GET /api/public/{slug}/menu itself still has a short s-maxage as a
  // backstop, but the site's own ISR'd pages (/, /menu) are revalidated
  // on-demand here so a publish shows up immediately rather than waiting
  // out that window.
  revalidatePublicMenuSurfaces();

  // The post-publish hook docs/07 reserved (docs/10): crosspost to Facebook /
  // Instagram. Deliberately LAST and awaited-but-unfailable — the site is
  // already live by this point, and postToSocialTargets never throws, so a
  // Meta outage can't fail or roll back a publish. Uses the service-role
  // client because it decrypts Page tokens and writes social_posts, which the
  // owner's session can also do — but the cron path (no session) calls the
  // same function, and one code path for both is worth more than reusing the
  // caller's client here.
  await postToSocialTargets(createAdminClient(), restaurantId, snapshot);

  return snapshot;
}

/**
 * Schedule a go-live (docs/02, docs/07 Phase 2): the snapshot is created
 * NOW — what goes live later is exactly what was approved today, even if
 * the draft/profile changes before fire_at. The pointer flip itself happens
 * in /api/cron/promote-schedules.
 */
export async function scheduleMenuPublish(
  supabase: SupabaseClient,
  menuId: string,
  fireAt: string
): Promise<PublishSchedule> {
  const { snapshot, restaurantId } = await createSnapshot(supabase, menuId);

  const { data: schedule, error } = await supabase
    .from("publish_schedules")
    .insert({ restaurant_id: restaurantId, snapshot_id: snapshot.id, fire_at: fireAt, status: "pending" })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("menus").update({ status: "scheduled" }).eq("id", menuId);

  return schedule as PublishSchedule;
}
