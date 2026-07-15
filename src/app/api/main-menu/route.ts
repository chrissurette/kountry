import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMainMenu, replaceMainMenu } from "@/lib/main-menu/service";
import { mainMenuPatchSchema } from "@/lib/main-menu/schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function GET() {
  const supabase = await createClient();
  try {
    const mainMenu = await getMainMenu(supabase);
    return NextResponse.json(mainMenu);
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to load main menu." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = mainMenuPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await replaceMainMenu(supabase, parsed.data);
    revalidatePath("/menu");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to save main menu." }, { status: 500 });
  }
}
