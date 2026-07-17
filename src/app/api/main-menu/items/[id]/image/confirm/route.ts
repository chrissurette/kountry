import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PhotoPolicyError, verifyStoredPhoto } from "@/lib/uploads/verify-stored-photo";
import { deleteMenuItemImage, MenuItemNotFoundError } from "@/lib/main-menu/item-image-service";

/**
 * Called by the client right after a signed upload actually finishes
 * (main-menu-editor.tsx) — same reasoning as /api/site-media/confirm:
 * revalidating in the POST /api/main-menu/items/[id]/image handler itself
 * would be premature since that route only issues the signed URL.
 *
 * Also enforces the photo policy on what actually landed (2026-07-16): a
 * non-WebP/JPEG or oversized file is deleted from Storage and unlinked from
 * the item, and the upload 422s — the client converts to WebP q90, but this
 * is what makes that a guarantee rather than a convention.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // The item's image_path was set when the upload target was issued, so it's
  // the authority on what to verify — no need to trust a client-sent path.
  const { data: item } = await supabase.from("main_menu_items").select("image_path").eq("id", id).maybeSingle();
  const path = item?.image_path as string | null | undefined;

  if (path) {
    try {
      await verifyStoredPhoto(supabase, "site-media", path);
    } catch (err) {
      if (err instanceof PhotoPolicyError) {
        try {
          // Clears image_path (the Storage object is already gone; remove()
          // on a missing key is a no-op, so this stays safe).
          await deleteMenuItemImage(supabase, id);
        } catch (cleanupErr) {
          if (!(cleanupErr instanceof MenuItemNotFoundError)) throw cleanupErr;
        }
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      throw err;
    }
  }

  revalidatePath("/menu");
  return NextResponse.json({ ok: true });
}
