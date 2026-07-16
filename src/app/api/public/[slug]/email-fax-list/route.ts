import { NextResponse } from "next/server";
import { emailFaxRequestSchema } from "@/lib/email-fax/schema";
import { createEmailFaxRequestPublic } from "@/lib/email-fax/service";
import { notifyNetlifyForms } from "@/lib/email-fax/netlify-notify";
import { checkPublicRateLimit } from "@/lib/rate-limit";

// Same open-CORS stance as the subscribe write (docs/04) — one consistent
// public API surface. Defenses mirror it exactly: honeypot, Zod validation,
// per-hashed-IP rate limit; worst case is a spam-flooded log the owner
// bulk-deletes from /admin/email-fax-list.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);

  // Honeypot — named `website` here, not `company`, because this form has a
  // REAL business-name field; a hidden "company" input next to it invites
  // false positives from overzealous autofill. Same silent fake-success as
  // the subscribe route so bots aren't tipped off. Checked before the rate
  // limit so honeypot traffic never costs a counter bump.
  if (body && typeof body === "object" && "website" in body && body.website) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  if (!(await checkPublicRateLimit("email_fax", request))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const parsed = emailFaxRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const result = await createEmailFaxRequestPublic(slug, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404, headers: CORS_HEADERS });
    }
    // Only AFTER the row is saved: forward to Netlify Forms so the owner
    // gets an email notification. Best-effort by design — it never fails
    // the request (and locally it just logs), so the DB and the
    // notifications can only diverge in the safe direction: a saved entry
    // with a missed email, never an email for an unsaved entry.
    await notifyNetlifyForms(new URL(request.url).origin, parsed.data);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not save your request. Please try again." },
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
