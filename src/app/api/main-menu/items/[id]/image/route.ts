import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMenuItemImageUploadTarget, deleteMenuItemImage, MenuItemNotFoundError } from "@/lib/main-menu/item-image-service";
import { menuItemImageUploadSchema } from "@/lib/main-menu/schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = menuItemImageUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const target = await createMenuItemImageUploadTarget(supabase, id, parsed.data.ext);
    return NextResponse.json(target);
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof MenuItemNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to create upload target." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await deleteMenuItemImage(supabase, id);
    revalidatePath("/menu");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MenuItemNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete image." }, { status: 500 });
  }
}
