import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantIdOrThrow, NoRestaurantError } from "@/lib/auth/restaurant-id";
import { translateMainMenuRequestSchema } from "@/lib/main-menu/translate-schema";
import { translateMainMenuUnits } from "@/lib/main-menu/translate-service";
import { ProviderError } from "@/lib/providers/types";

/**
 * Translates the given section/item name+description units to Spanish
 * (docs/06's "Language toggle" note, step 2). Stateless — takes whatever the
 * Main Menu editor currently has in memory (including unsaved edits) and
 * returns translations for the client to merge and review; the owner still
 * has to hit Save to persist anything.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = translateMainMenuRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const restaurantId = await getRestaurantIdOrThrow(supabase);
    const translations = await translateMainMenuUnits(restaurantId, parsed.data.units);
    return NextResponse.json({ translations: Array.from(translations.values()) });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ProviderError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "rate_limited" ? 429 : 422 });
    }
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}
