import { NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribeByToken } from "@/lib/subscribers/service";
import { checkPublicRateLimit } from "@/lib/rate-limit";

// Same open-CORS stance as the rest of /api/public (docs/04). The token is the
// authorization, so there's nothing a cross-origin caller could do here that
// the token holder couldn't already do by clicking the link.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

const requestSchema = z.object({ token: z.string().min(1).max(128) });

/**
 * POST, not GET, is what actually unsubscribes — the link in an email points
 * at the /unsubscribe *page*, which confirms first. Corporate mail scanners
 * and link prefetchers (Outlook Safe Links, etc.) routinely issue GETs against
 * every URL in a message; if a GET performed the opt-out, those scanners would
 * silently unsubscribe people who never clicked anything.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }

  // Deliberately generous limit + fail-open (src/lib/rate-limit.ts): a
  // blocked legitimate opt-out is a worse outcome than any abuse this
  // endpoint enables, so the limiter exists only to blunt blind request
  // floods — the 256-bit token already makes guessing a non-threat.
  if (!(await checkPublicRateLimit("unsubscribe", request))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a little while." },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  try {
    const result = await unsubscribeByToken(parsed.data.token);
    if (!result) {
      // Generic on purpose: an unknown token gets the same answer whether it
      // never existed or was deleted, so this can't be used to probe the list.
      return NextResponse.json({ error: "This link is no longer valid." }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json({ ok: true, maskedContact: result.maskedContact }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ error: "Could not process the request." }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" },
  });
}
