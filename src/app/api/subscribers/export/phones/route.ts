import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSubscribersForExport, subscribersToPhoneCsv } from "@/lib/subscribers/service";

/**
 * Phone counterpart of ../route.ts (the email export) — same shape, same
 * origin-from-request reasoning, same suppression filter inside the CSV
 * builder. Exists so a phone-only subscriber's unsubscribe link can actually
 * reach them if the owner contacts them manually (docs/09); it is not an SMS
 * mailing surface — see subscribersToPhoneCsv's note.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    const subscribers = await listSubscribersForExport(supabase);
    const origin = new URL(request.url).origin;
    const csv = subscribersToPhoneCsv(subscribers, origin);
    const filename = `subscriber-phones-${new Date().toISOString().slice(0, 10)}.csv`;
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
