import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateSpecialImage } from "@/lib/menu/generate-image-service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";
import { ProviderError } from "@/lib/providers/types";

const styleSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("preset"), key: z.string() }),
  z.object({ type: z.literal("custom"), id: z.string().uuid() }),
  z.object({ type: z.literal("prompt"), text: z.string().min(1).max(2000) }),
]);

const requestSchema = z.object({
  asset_id: z.string().uuid(),
  styleSource: styleSourceSchema.optional(),
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
    const result = await generateSpecialImage(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 502 });
    return NextResponse.json({ error: "Failed to generate the special image." }, { status: 500 });
  }
}
