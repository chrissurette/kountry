import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSubscribers, createSubscriberByOwner, deleteSubscribers } from "@/lib/subscribers/service";
import { createSubscriberSchema, deleteSubscribersSchema } from "@/lib/subscribers/schema";
import { NoRestaurantError } from "@/lib/auth/restaurant-id";

export async function GET() {
  const supabase = await createClient();
  try {
    const subscribers = await listSubscribers(supabase);
    return NextResponse.json({ subscribers });
  } catch {
    return NextResponse.json({ error: "Failed to list subscribers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSubscriberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = await createSubscriberByOwner(supabase, parsed.data);
    if (!result.ok) {
      // "unsubscribed" is deliberately its own message rather than folding into
      // the generic duplicate: the owner needs to know *why* they can't add
      // this person back, or it just looks like a broken duplicate check.
      return NextResponse.json(
        {
          error:
            result.reason === "unsubscribed"
              ? "That contact unsubscribed from the list. They'll need to sign up again themselves — you can't re-add them here."
              : "That email or phone number is already on the list.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ subscriber: result.subscriber });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to add subscriber." }, { status: 500 });
  }
}

// Bulk delete (checkbox-selected rows) — a JSON body on DELETE rather than
// the /[id] pattern used elsewhere (site-media, etc.), since the actual UI
// interaction here is "select several rows, delete them together," not a
// per-row action.
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = deleteSubscribersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await deleteSubscribers(supabase, parsed.data.ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NoRestaurantError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
