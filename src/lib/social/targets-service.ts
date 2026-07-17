import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptProviderKey, decryptProviderKey } from "@/lib/providers/crypto";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { GraphError, getLinkedInstagramAccount, postPhotoToInstagram, postPhotoToPage, type MetaPage } from "./graph";
import type { MenuSnapshotPayload, PublishedSnapshot } from "@/types/database";

export type PublishTargetKind = "facebook_page" | "instagram_business";

/**
 * What the admin UI is allowed to see. Explicit allowlist that OMITS
 * `encrypted_access_token` — same discipline as the provider-key
 * PUBLIC_COLUMNS and SubscriberListItem: this row is serialized into the
 * Settings page's HTML for a client component, and a live credential that can
 * post as the restaurant has no business riding along in that payload.
 */
export interface PublishTargetView {
  id: string;
  kind: PublishTargetKind;
  enabled: boolean;
  display_name: string;
  connected_at: string;
}
const VIEW_FIELDS = "id, kind, enabled, display_name, connected_at";

export interface SocialPostView {
  id: string;
  kind: PublishTargetKind;
  status: "posted" | "failed";
  error: string | null;
  created_at: string;
}

/**
 * Both Settings reads below **fail soft**: on any error they log and return
 * empty, so the panel shows its disconnected state instead of taking the
 * whole Settings page — profile, hours, AI provider keys, account — down with
 * it. Social publishing is an add-on bolted onto that page; it has no business
 * being able to break it.
 *
 * This is not hypothetical: these two selects 500'd the entire Settings screen
 * in the window between deploying this code and hand-applying migration ..032
 * (caught in live verification). Same class as the incident CLAUDE.md records
 * where a `.select()` naming a not-yet-migrated column silently emptied the
 * public /menu page.
 *
 * Logging rather than swallowing is deliberate — the project already learned
 * (getCurrentRestaurant) that a silent catch turns a real DB error into a
 * confusing "nothing's connected" instead of something diagnosable.
 */
export async function listPublishTargets(supabase: SupabaseClient): Promise<PublishTargetView[]> {
  const { data, error } = await supabase.from("publish_targets").select(VIEW_FIELDS).order("kind");
  if (error) {
    console.error("listPublishTargets failed (social panel renders empty):", error);
    return [];
  }
  return (data as unknown as PublishTargetView[]) ?? [];
}

/** The last few crosspost attempts, so Settings can show "posted" / "failed — reconnect" rather than staying silent about a broken token. Fails soft — see above. */
export async function listRecentSocialPosts(supabase: SupabaseClient, limit = 6): Promise<SocialPostView[]> {
  const { data, error } = await supabase
    .from("social_posts")
    .select("id, kind, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listRecentSocialPosts failed (social panel renders empty):", error);
    return [];
  }
  return (data as SocialPostView[]) ?? [];
}

export async function setTargetEnabled(supabase: SupabaseClient, id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("publish_targets").update({ enabled }).eq("id", id);
  if (error) throw error;
}

/** Disconnect: dropping the rows drops the encrypted tokens with them. social_posts survive (target_id nulls out) so history isn't rewritten. */
export async function disconnectMeta(supabase: SupabaseClient): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { error } = await supabase.from("publish_targets").delete().eq("restaurant_id", restaurantId);
  if (error) throw error;
}

/**
 * Persists a completed Meta connection: the Facebook Page always, plus the
 * linked Instagram Business account when there is one. Upserts on
 * (restaurant_id, kind) so reconnecting refreshes the token in place instead
 * of piling up stale credentials.
 *
 * Only the PAGE token is stored (encrypted) — the user token that produced it
 * is deliberately discarded by the caller: Page tokens don't expire, so the
 * user token is a stepping stone with nothing to gain from keeping it
 * (docs/10).
 */
export async function saveMetaConnection(
  supabase: SupabaseClient,
  page: MetaPage
): Promise<{ igConnected: boolean }> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const encrypted = encryptProviderKey(page.access_token);

  const { error: pageError } = await supabase.from("publish_targets").upsert(
    {
      restaurant_id: restaurantId,
      kind: "facebook_page",
      page_id: page.id,
      ig_user_id: null,
      display_name: page.name,
      encrypted_access_token: encrypted,
      connected_at: new Date().toISOString(),
      enabled: true,
    },
    { onConflict: "restaurant_id,kind" }
  );
  if (pageError) throw pageError;

  // A missing IG link is a normal state, not an error — the owner may simply
  // not have linked Instagram to the Page. Never let it fail the whole connect.
  let ig: { id: string; username: string | null } | null = null;
  try {
    ig = await getLinkedInstagramAccount(page.id, page.access_token);
  } catch (err) {
    console.error("Instagram lookup failed during connect (Facebook still connected):", err);
  }

  if (ig) {
    const { error: igError } = await supabase.from("publish_targets").upsert(
      {
        restaurant_id: restaurantId,
        kind: "instagram_business",
        page_id: page.id,
        ig_user_id: ig.id,
        display_name: ig.username ? `@${ig.username}` : "Instagram",
        encrypted_access_token: encrypted,
        connected_at: new Date().toISOString(),
        enabled: true,
      },
      { onConflict: "restaurant_id,kind" }
    );
    if (igError) throw igError;
  } else {
    // Reconnecting after unlinking IG shouldn't leave a target that can only fail.
    await supabase.from("publish_targets").delete().eq("restaurant_id", restaurantId).eq("kind", "instagram_business");
  }

  return { igConnected: !!ig };
}

/**
 * Caption for a crosspost. English only by design: the site serves both
 * languages, but a social post is one post — and `special_data` (English) is
 * the canonical board. Kept short and factual; IG allows 2,200 chars, so
 * length is never the constraint here.
 */
function buildCaption(payload: MenuSnapshotPayload): string {
  const title = payload.menu.title?.trim() || "Today's Specials";
  const name = payload.restaurant.name;
  const lines = [`${title} — ${name}`];
  if (payload.restaurant.phone) lines.push(`Call to order: ${payload.restaurant.phone}`);
  return lines.join("\n");
}

interface TargetRow {
  id: string;
  kind: PublishTargetKind;
  page_id: string;
  ig_user_id: string | null;
  encrypted_access_token: string;
}

/**
 * The post-publish hook docs/07 reserved and docs/10 specified: after the
 * pointer flip, push the approved special to every enabled target.
 *
 * **Best-effort by construction — this must never throw.** Publishing the
 * menu to the restaurant's own site is the job; the crosspost is a bonus, so
 * a Meta outage, a dead token, or a missing image can never fail, delay, or
 * roll back a publish (same philosophy as the Netlify Forms notify). Every
 * attempt lands in `social_posts`, which is how a failure stays visible
 * instead of vanishing — Settings reads that log.
 *
 * Takes the service-role client on purpose: the cron promotion path has no
 * session (docs/02), and both callers need identical behavior.
 */
export async function postToSocialTargets(
  admin: SupabaseClient,
  restaurantId: string,
  snapshot: PublishedSnapshot
): Promise<{ posted: number; failed: number }> {
  const result = { posted: 0, failed: 0 };
  try {
    const { data: targets } = await admin
      .from("publish_targets")
      .select("id, kind, page_id, ig_user_id, encrypted_access_token")
      .eq("restaurant_id", restaurantId)
      .eq("enabled", true);
    if (!targets?.length) return result;

    const payload = snapshot.payload as MenuSnapshotPayload;
    const caption = buildCaption(payload);

    for (const target of targets as TargetRow[]) {
      // IG needs the 4:5 JPEG; Facebook takes the natural-ratio one. A menu
      // rendered before this feature (or from a browser that couldn't compose
      // JPEGs) has neither — skip rather than post the SVG, which Meta would
      // reject anyway.
      const imageUrl = target.kind === "instagram_business" ? payload.menu.socialImageIgUrl : payload.menu.socialImageUrl;
      if (!imageUrl) {
        await logPost(admin, restaurantId, target, snapshot.id, {
          status: "failed",
          error: "No social image was rendered for this menu. Re-render it from the Review screen and publish again.",
        });
        result.failed++;
        continue;
      }

      try {
        const token = decryptProviderKey(target.encrypted_access_token);
        const externalId =
          target.kind === "instagram_business"
            ? await postPhotoToInstagram(target.ig_user_id!, token, imageUrl, caption)
            : await postPhotoToPage(target.page_id, token, imageUrl, caption);
        await logPost(admin, restaurantId, target, snapshot.id, { status: "posted", external_post_id: externalId });
        result.posted++;
      } catch (err) {
        // Code 190 = token invalid/expired: the one failure whose fix is
        // specific and actionable, so say so instead of echoing Meta's jargon.
        const message =
          err instanceof GraphError && err.code === 190
            ? "The Facebook connection has expired. Reconnect it in Settings."
            : err instanceof Error
              ? err.message
              : "Unknown error";
        await logPost(admin, restaurantId, target, snapshot.id, { status: "failed", error: message });
        result.failed++;
      }
    }
  } catch (err) {
    // Belt and braces: even a failure to *read* the targets can't touch the publish.
    console.error("postToSocialTargets failed (non-blocking):", err);
  }
  return result;
}

async function logPost(
  admin: SupabaseClient,
  restaurantId: string,
  target: TargetRow,
  snapshotId: string,
  outcome: { status: "posted" | "failed"; external_post_id?: string; error?: string }
): Promise<void> {
  const { error } = await admin.from("social_posts").insert({
    restaurant_id: restaurantId,
    target_id: target.id,
    snapshot_id: snapshotId,
    kind: target.kind,
    status: outcome.status,
    external_post_id: outcome.external_post_id ?? null,
    error: outcome.error ?? null,
  });
  if (error) console.error("could not write social_posts row:", error);
}
