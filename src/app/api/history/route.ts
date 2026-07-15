import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSnapshots } from "@/lib/history/service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function GET() {
  const supabase = await createClient();
  try {
    const snapshots = await listSnapshots(supabase);
    return NextResponse.json({ snapshots });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to list history." }, { status: 500 });
  }
}
