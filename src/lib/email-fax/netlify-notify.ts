import type { EmailFaxRequestInput } from "./schema";

/**
 * Forwards a saved daily-special request to Netlify Forms so the owner gets
 * Netlify's email notification (2026-07-16, owner's ask). Netlify intercepts
 * url-encoded POSTs carrying a registered `form-name` at its CDN; the form is
 * registered by the hidden definition in public/__forms.html (the documented
 * Next.js-runtime workaround — the build scanner can't see server-rendered
 * pages), and POSTing to that static path is what its docs prescribe.
 *
 * Called AFTER the Supabase insert succeeds, never before — the database is
 * the source of truth and this is strictly best-effort: a Netlify hiccup (or
 * local dev, where no interception exists and this 405s) loses only the
 * notification, never the entry. That's why every failure path swallows to a
 * console.error instead of surfacing to the visitor, and why the 5s timeout
 * exists — a slow Netlify must not hang a submission that already saved.
 *
 * Origin comes from the incoming request, not NEXT_PUBLIC_SITE_URL, for the
 * same reason as the CSV export route (that var isn't set on Netlify).
 */
export async function notifyNetlifyForms(origin: string, input: EmailFaxRequestInput): Promise<void> {
  const body = new URLSearchParams({
    "form-name": "email-fax-list",
    business_name: input.businessName,
    method: input.method,
    fax: input.method === "email" ? "" : (input.fax ?? ""),
    email: input.method === "fax" ? "" : (input.email ?? ""),
    days: input.days.length === 0 ? "every day" : input.days.join(", "),
    notes: input.notes ?? "",
  });

  try {
    const res = await fetch(`${origin}/__forms.html`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`Netlify Forms notify failed (non-blocking): ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error("Netlify Forms notify failed (non-blocking):", err);
  }
}
