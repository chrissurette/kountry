import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testCredential } from "@/lib/providers/keys-service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";
import { ProviderError } from "@/lib/providers/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    const status = await testCredential(supabase, id);
    return NextResponse.json({ status });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 502 });
    return NextResponse.json({ error: "Failed to test the provider key." }, { status: 500 });
  }
}
