import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { clearStaleLiveSpecials, revalidatePublicMenuSurfaces } from "@/lib/publish/service";
import { postToSocialTargets } from "@/lib/social/targets-service";
import type { PublishedSnapshot } from "@/types/database";

/**
 * Polled every minute by a Netlify Scheduled Function (netlify/functions/
 * promote-schedules.mts + netlify.toml), which just fetches this route with
 * the CRON_SECRET header — all the actual logic lives here, not in the
 * function. Promotes any due, pending schedules by flipping
 * restaurants.live_snapshot_id — docs/02's "the pointer flip itself happens
 * here, not at schedule-creation time".
 *
 * No user session exists in a scheduled invocation, so the admin
 * (service-role) client is the correct, sanctioned use here (CLAUDE.md's
 * provider-key rule doesn't apply, but the same "admin client only for
 * genuinely session-less server code" principle does). Guarded by
 * CRON_SECRET, checked below — the scheduled function sends
 * `Authorization: Bearer $CRON_SECRET`.
 *
 * Stays a GET handler (not POST) to match what the scheduled function sends.
 */
export async function GET(request: Request) {
  const env = getServerEnv();
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: due, error } = await admin
    .from("publish_schedules")
    .select("id, restaurant_id, snapshot_id")
    .eq("status", "pending")
    .lte("fire_at", new Date().toISOString());
  if (error) {
    return NextResponse.json({ error: "Failed to query due schedules." }, { status: 500 });
  }

  let promoted = 0;
  for (const schedule of due ?? []) {
    // The status='pending' guard makes this idempotent under overlapping cron runs.
    const { data: claimed } = await admin
      .from("publish_schedules")
      .update({ status: "done", fired_at: new Date().toISOString() })
      .eq("id", schedule.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    // live_since drives the midnight auto-clear (clearStaleLiveSpecials, below).
    await admin
      .from("restaurants")
      .update({ live_snapshot_id: schedule.snapshot_id, live_since: new Date().toISOString() })
      .eq("id", schedule.restaurant_id);

    const { data: snapshot } = await admin
      .from("published_snapshots")
      .select("*")
      .eq("id", schedule.snapshot_id)
      .maybeSingle();
    if (snapshot?.menu_id) {
      await admin.from("menus").update({ status: "published" }).eq("id", snapshot.menu_id);
    }

    revalidatePublicMenuSurfaces();

    // Crosspost to Facebook/Instagram (docs/10) — the same hook publishMenuNow
    // runs, so a scheduled special reaches social too. It posts the JPEG URLs
    // frozen into the snapshot at approval time (there's no browser here to
    // compose them), never throws, and each Graph call is capped at 5s so a
    // hanging Meta can't eat this per-minute function's runtime budget.
    if (snapshot) {
      await postToSocialTargets(admin, schedule.restaurant_id, snapshot as PublishedSnapshot);
    }

    promoted++;
  }

  // Same tick also clears any live special that has rolled past its local
  // midnight — so "today's special" disappears on its own and the site falls
  // back to the hero/placeholder until the owner publishes a new one.
  const cleared = await clearStaleLiveSpecials(admin);

  return NextResponse.json({ promoted, cleared });
}
