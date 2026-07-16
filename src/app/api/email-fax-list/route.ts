import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listEmailFaxRequests, deleteEmailFaxRequests } from "@/lib/email-fax/service";
import { deleteEmailFaxRequestsSchema } from "@/lib/email-fax/schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

// Owner-only twice over: not in the middleware's employee allowlist (an
// employee gets 403 there), and the table's RLS is owner-only regardless
// (migration ..031) — the subscribers defense-in-depth pattern.

export async function GET() {
  const supabase = await createClient();
  try {
    const requests = await listEmailFaxRequests(supabase);
    return NextResponse.json({ requests });
  } catch {
    return NextResponse.json({ error: "Failed to list requests." }, { status: 500 });
  }
}

// Bulk delete via JSON body, matching /api/subscribers — the UI action is
// "select several rows, delete together."
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = deleteEmailFaxRequestsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await deleteEmailFaxRequests(supabase, parsed.data.ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
