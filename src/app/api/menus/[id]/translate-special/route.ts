import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantIdOrThrow, NoRestaurantError } from "@/lib/auth/restaurant-id";
import { dailySpecialMenuSchema } from "@/lib/menu/special-menu-schema";
import { translateSpecialMenu } from "@/lib/menu/translate-special-service";
import { ProviderError } from "@/lib/providers/types";

const requestSchema = z.object({ menu: dailySpecialMenuSchema });

/**
 * Translates the current (possibly owner-edited, not-yet-saved) Daily
 * Special text to Spanish. Stateless, like Main Menu's translate route —
 * doesn't touch the database, just returns a full translated menu for the
 * Review screen to show and let the owner correct before it's rendered/saved.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const restaurantId = await getRestaurantIdOrThrow(supabase);
    const menu = await translateSpecialMenu(restaurantId, parsed.data.menu);
    return NextResponse.json({ menu });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 422 });
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}
