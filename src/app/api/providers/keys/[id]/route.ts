import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteCredential } from "@/lib/providers/keys-service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await deleteCredential(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete the provider key." }, { status: 500 });
  }
}
