import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: schedule, error } = await supabase.from("publish_schedules").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  return NextResponse.json({ schedule });
}

/** Cancels a pending schedule (docs/02: "Canceling a schedule = setting status='canceled'") — the already-created snapshot stays in history, just unlinked from any future publish. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: schedule, error } = await supabase
    .from("publish_schedules")
    .update({ status: "canceled" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not cancel — it may have already fired." }, { status: 409 });
  return NextResponse.json({ schedule });
}
