import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Called by the client right after a signed upload actually finishes
 * (main-menu-editor.tsx) — same reasoning as /api/site-media/confirm:
 * revalidating in the POST /api/main-menu/items/[id]/image handler itself
 * would be premature since that route only issues the signed URL.
 */
export async function POST() {
  revalidatePath("/menu");
  return NextResponse.json({ ok: true });
}
