import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PhotoPolicyError, verifyStoredPhoto } from "@/lib/uploads/verify-stored-photo";
import { deleteSiteMediaByPath } from "@/lib/site-media/service";

/**
 * Called by the client right after a signed upload actually finishes
 * (src/app/admin/site/site-media-manager.tsx) — revalidating in the POST
 * /api/site-media handler itself would be premature, since that route only
 * issues the signed URL; the file lands in Storage moments later from the
 * browser.
 *
 * Also the **enforcement point for the photo policy** (2026-07-16): the
 * client converts to WebP q90 before upload, but that's a convention, not a
 * guarantee — so this reads back what actually landed and rejects
 * non-WebP/JPEG or oversized files, removing the Storage object AND its
 * site_media row so a rejected upload leaves nothing behind.
 *
 * `path` is optional so a caller that doesn't send one still revalidates
 * (backwards-compatible); when present, the file is verified first.
 */
const bodySchema = z.object({ path: z.string().min(1).optional() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  const path = parsed.success ? parsed.data.path : undefined;

  if (path) {
    const supabase = await createClient();
    try {
      await verifyStoredPhoto(supabase, "site-media", path);
    } catch (err) {
      if (err instanceof PhotoPolicyError) {
        // The row was created when the upload target was issued; drop it too,
        // or the gallery would show a broken tile for a deleted file.
        await deleteSiteMediaByPath(supabase, path);
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      throw err;
    }
  }

  revalidatePath("/");
  revalidatePath("/gallery");
  return NextResponse.json({ ok: true });
}
