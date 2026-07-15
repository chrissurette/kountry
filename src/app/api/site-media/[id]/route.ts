import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteSiteMedia, updateSiteMediaCaption } from "@/lib/site-media/service";
import { updateSiteMediaSchema } from "@/lib/site-media/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSiteMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await updateSiteMediaCaption(supabase, id, parsed.data.caption);
    revalidatePath("/gallery");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update caption." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await deleteSiteMedia(supabase, id);
    revalidatePath("/");
    revalidatePath("/gallery");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
