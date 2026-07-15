import { NextResponse } from "next/server";
import { getLiveMenuPayload } from "@/lib/public-menu/service";

// This app's own site reads the live snapshot via a direct function call
// (src/lib/public-menu/service.ts), not this HTTP route — CORS stays open
// here for any future cross-origin consumer instead (docs/02, docs/04).
// This is read-only, unauthenticated, published data — no session or
// secret ever touches this route, so open CORS is safe.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

// docs/02: the public API is edge-cached with a 60s stale-while-revalidate
// window instead of an explicit purge-on-publish (see docs/publish/service.ts).
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getLiveMenuPayload(slug);

  if (!payload) {
    return NextResponse.json({ error: "No published menu for this restaurant." }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json(payload, { headers: { ...CORS_HEADERS, ...CACHE_HEADERS } });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}
