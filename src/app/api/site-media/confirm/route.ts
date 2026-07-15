import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Called by the client right after a signed upload actually finishes
 * (src/app/admin/site/site-media-manager.tsx) — revalidating in the POST
 * /api/site-media handler itself would be premature, since that route only
 * issues the signed URL; the file lands in Storage moments later from the
 * browser. No auth/body needed here, it's just a revalidation trigger for
 * public pages that are already public.
 */
export async function POST() {
  revalidatePath("/");
  revalidatePath("/gallery");
  return NextResponse.json({ ok: true });
}
