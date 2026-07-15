import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderAndStoreSpecial } from "@/lib/menu/render-special-service";
import { dailySpecialMenuSchema } from "@/lib/menu/special-menu-schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";
import { ProviderError } from "@/lib/providers/types";
import { z } from "zod";

const requestSchema = z.object({
  menu: dailySpecialMenuSchema,
  themeId: z.string(),
  menuEs: dailySpecialMenuSchema.nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = await renderAndStoreSpecial(supabase, {
      menu_id: id,
      menu: parsed.data.menu,
      themeId: parsed.data.themeId,
      menuEs: parsed.data.menuEs,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Failed to render the menu." }, { status: 500 });
  }
}
