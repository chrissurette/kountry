import { NextResponse } from "next/server";
import { getMainMenuForSlug } from "@/lib/public-main-menu/service";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sections = await getMainMenuForSlug(slug);

  if (sections === null) {
    return NextResponse.json({ error: "Unknown restaurant." }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json({ sections }, { headers: { ...CORS_HEADERS, ...CACHE_HEADERS } });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}
