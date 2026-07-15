import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCredentials, upsertCredential } from "@/lib/providers/keys-service";
import { addCredentialSchema } from "@/lib/providers/keys-schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function GET() {
  const supabase = await createClient();
  try {
    const credentials = await listCredentials(supabase);
    return NextResponse.json({ credentials });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to list provider keys." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = addCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const credential = await upsertCredential(supabase, parsed.data.provider, parsed.data.apiKey);
    return NextResponse.json({ credential });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to save the provider key." }, { status: 500 });
  }
}
