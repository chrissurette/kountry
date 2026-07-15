import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteCustomStyle } from "@/lib/menu/custom-styles-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await deleteCustomStyle(supabase, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete style." }, { status: 500 });
  }
}
