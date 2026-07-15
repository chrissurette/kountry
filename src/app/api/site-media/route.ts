import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSiteMediaUploadTarget, listSiteMedia } from "@/lib/site-media/service";
import { createSiteMediaSchema } from "@/lib/site-media/schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";
import type { SiteMediaKind } from "@/types/database";

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") as SiteMediaKind | null;
  const supabase = await createClient();
  try {
    const media = await listSiteMedia(supabase, kind ?? undefined);
    return NextResponse.json({ media });
  } catch {
    return NextResponse.json({ error: "Failed to list site media." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSiteMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const target = await createSiteMediaUploadTarget(supabase, parsed.data);
    return NextResponse.json(target);
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to create upload target." }, { status: 500 });
  }
}
