import { NextResponse } from "next/server";
import { subscribeSchema } from "@/lib/subscribers/schema";
import { createSubscriberPublic } from "@/lib/subscribers/service";
import { checkPublicRateLimit } from "@/lib/rate-limit";

// Same open-CORS stance as GET /api/public/{slug}/menu (docs/02, docs/04) —
// one consistent public API surface for any future cross-origin consumer.
// This one writes, not reads, but the blast radius is low (worst case: a
// spam row in the mailing list, trivially bulk-deleted from
// /admin/subscribers) and it's mitigated by field validation, a honeypot
// field, and the migration's per-restaurant unique email/phone indexes
// rejecting duplicate spam.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);

  // Honeypot: a hidden field real visitors never fill in; bots that blindly
  // fill every input do. Pretend success rather than a 400 so as not to tip
  // off anything sophisticated enough to retry on an explicit rejection.
  // Checked before the rate limit so honeypot traffic never even costs a
  // counter bump.
  if (body && typeof body === "object" && "company" in body && body.company) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  // Per-hashed-IP fixed window (src/lib/rate-limit.ts) — fails open, so a
  // DB hiccup degrades to "no rate limiting", never a broken form. The
  // client maps the 429 status to a localized message; the body's message
  // is the English fallback, consistent with the other server-origin errors.
  if (!(await checkPublicRateLimit("subscribe", request))) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Please try again later." },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const result = await createSubscriberPublic(slug, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404, headers: CORS_HEADERS });
    }
    // Deliberately identical whether this was a new signup or a repeat: the
    // service still distinguishes them internally (it has to, to un-suppress
    // a returning subscriber), but surfacing that here would turn an
    // unauthenticated, `Access-Control-Allow-Origin: *` endpoint into a
    // membership oracle — anyone could POST an address and learn whether it's
    // on the list. The /unsubscribe route already refuses to be probed this
    // way; these two are the same threat and now give the same non-answer.
    // "You're on the list" is true in both cases, so nothing is lost.
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save your info. Please try again." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" },
  });
}
