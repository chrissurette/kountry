import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { disconnectMeta, setTargetEnabled } from "@/lib/social/targets-service";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

// Owner-only twice over: /api/social is outside the employee middleware
// allowlist, and publish_targets' RLS is owner-only (migration ..032).

/** Pause/resume one target without disconnecting the account. */
const patchSchema = z.object({ id: z.string().uuid(), enabled: z.boolean() });

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await setTargetEnabled(supabase, parsed.data.id, parsed.data.enabled);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update that account." }, { status: 500 });
  }
}

/** Disconnect entirely — deletes the targets, and with them the encrypted tokens. */
export async function DELETE() {
  const supabase = await createClient();
  try {
    await disconnectMeta(supabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not disconnect." }, { status: 500 });
  }
}
