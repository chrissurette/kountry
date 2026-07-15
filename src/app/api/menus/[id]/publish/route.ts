import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publishMenuNow, scheduleMenuPublish } from "@/lib/publish/service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

const publishRequestSchema = z.object({ at: z.string().datetime().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = publishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    if (parsed.data.at) {
      if (new Date(parsed.data.at).getTime() <= Date.now()) {
        return NextResponse.json({ error: "Scheduled time must be in the future." }, { status: 400 });
      }
      const schedule = await scheduleMenuPublish(supabase, id, parsed.data.at);
      return NextResponse.json({ schedule });
    }
    const snapshot = await publishMenuNow(supabase, id);
    return NextResponse.json({ snapshot });
  } catch (err) {
    if (err instanceof NoRestaurantError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to publish." }, { status: 500 });
  }
}
