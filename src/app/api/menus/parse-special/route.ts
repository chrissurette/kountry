import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseSpecialMenu } from "@/lib/menu/parse-special-menu-service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";
import { ProviderError } from "@/lib/providers/types";

const requestSchema = z.object({
  asset_id: z.string().uuid(),
  menu_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = await parseSpecialMenu(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    // rate_limited is OUR throttle (resolveTask's runaway-spend guard), not a
    // provider failure — 429, so nothing upstream mistakes it for a Meta/AI
    // outage or retries it as transient.
    if (err instanceof ProviderError && err.code === "rate_limited")
      return NextResponse.json({ error: err.message }, { status: 429 });
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 502 });
    return NextResponse.json({ error: "Failed to read the menu photo." }, { status: 500 });
  }
}
