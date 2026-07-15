import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantProfile, updateRestaurantProfile, NoRestaurantError } from "@/lib/restaurant/service";
import { restaurantPatchSchema } from "@/lib/restaurant/schema";

export async function GET() {
  const supabase = await createClient();
  try {
    const restaurant = await getRestaurantProfile(supabase);
    return NextResponse.json({ restaurant });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load restaurant profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const body = await request.json().catch(() => null);
  const parsed = restaurantPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const restaurant = await updateRestaurantProfile(supabase, parsed.data);
    return NextResponse.json({ restaurant });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update restaurant profile." }, { status: 500 });
  }
}
