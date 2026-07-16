import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSubscribersForExport, subscribersToEmailCsv } from "@/lib/subscribers/service";

export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    const subscribers = await listSubscribersForExport(supabase);
    // Origin from the request rather than an env var: NEXT_PUBLIC_SITE_URL is
    // documented as not needing to be set on Netlify (CLAUDE.md), so relying
    // on it here would silently emit localhost/undefined unsubscribe links in
    // production — the one place a wrong URL is worst.
    const origin = new URL(request.url).origin;
    const csv = subscribersToEmailCsv(subscribers, origin);
    const filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export subscribers." }, { status: 500 });
  }
}
