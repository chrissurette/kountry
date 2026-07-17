import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantIdOrThrow, NoRestaurantError } from "@/lib/auth/restaurant-id";

/**
 * Issues signed upload URLs for the two social JPEGs the browser composes at
 * "Save & render" (docs/10) — same signed-upload-URL pattern as every other
 * upload in this app (site-media, menu capture), rather than POSTing ~1MB of
 * base64 through a serverless function.
 *
 * Employee-reachable on purpose: this lives under /api/menus, which IS in the
 * employee allowlist, because an employee runs the whole Daily Special flow
 * (docs/04) and "Save & render" must work for them. It only mints upload
 * targets scoped to the caller's own restaurant — it can't read or touch the
 * social *connection*, which stays owner-only.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const restaurantId = await getRestaurantIdOrThrow(supabase);

    // Confirm the menu belongs to this restaurant before minting anything —
    // the path embeds restaurantId, so without this an authenticated user of
    // another restaurant could aim an upload at a menu id they don't own.
    const { data: menu } = await supabase
      .from("menus")
      .select("id")
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (!menu) return NextResponse.json({ error: "Menu not found." }, { status: 404 });

    const base = `${restaurantId}/daily-special/${randomUUID()}`;
    const paths = { facebook: `${base}-fb.jpg`, instagram: `${base}-ig.jpg` };

    const [fb, ig] = await Promise.all([
      supabase.storage.from("site-media").createSignedUploadUrl(paths.facebook),
      supabase.storage.from("site-media").createSignedUploadUrl(paths.instagram),
    ]);
    if (fb.error) throw fb.error;
    if (ig.error) throw ig.error;

    return NextResponse.json({
      facebook: { path: paths.facebook, token: fb.data.token },
      instagram: { path: paths.instagram, token: ig.data.token },
    });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
  }
}
