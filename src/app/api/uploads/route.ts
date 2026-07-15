import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUploadTarget } from "@/lib/uploads/service";
import { createUploadSchema } from "@/lib/uploads/schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const target = await createUploadTarget(supabase, parsed.data);
    return NextResponse.json(target);
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to create upload target." }, { status: 500 });
  }
}
