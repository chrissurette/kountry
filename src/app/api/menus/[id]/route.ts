import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMenuWithContent, deleteMenu, MenuDeleteBlockedError } from "@/lib/menu/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    const menu = await getMenuWithContent(supabase, id);
    return NextResponse.json({ menu });
  } catch {
    return NextResponse.json({ error: "Menu not found." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await deleteMenu(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MenuDeleteBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to delete menu." }, { status: 500 });
  }
}
