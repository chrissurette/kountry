import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Subscriber } from "@/types/database";
import type { CreateSubscriberInput, SubscribeInput } from "./schema";

/**
 * What the admin UI is allowed to see. Explicit allowlist rather than
 * `select("*")` (same discipline as src/lib/site/restaurant.ts's SITE_FIELDS)
 * specifically to keep `unsubscribe_token` out: the admin page serializes its
 * rows into the page's HTML for a client component, and there's no reason
 * every subscriber's opt-out capability should ride along in that payload.
 * Only the CSV export — which the owner actually mails from — reads it.
 */
export type SubscriberListItem = Omit<Subscriber, "unsubscribe_token">;
const LIST_FIELDS = "id, restaurant_id, email, phone, source, unsubscribed_at, created_at";

/** Owner-facing list — RLS on the session-scoped client already restricts this to the caller's restaurant, same as listSiteMedia. Includes unsubscribed rows; the table shows their status. */
export async function listSubscribers(supabase: SupabaseClient): Promise<SubscriberListItem[]> {
  const { data, error } = await supabase.from("subscribers").select(LIST_FIELDS).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as SubscriberListItem[]) ?? [];
}

/**
 * Owner manually adding a subscriber (e.g. from a comment card or phone
 * call) — source stays "manual" to distinguish these from real homepage
 * signups. Deliberately refuses to touch a row that has unsubscribed: the
 * whole point of keeping a suppression record is that someone who opted out
 * can't be quietly put back on the list by a later manual entry. They have to
 * opt back in themselves via the homepage form.
 */
export async function createSubscriberByOwner(
  supabase: SupabaseClient,
  input: CreateSubscriberInput
): Promise<{ ok: true; subscriber: SubscriberListItem } | { ok: false; reason: "duplicate" | "unsubscribed" }> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  const existing = await findConflicting(supabase, restaurantId, input);
  if (existing) {
    return { ok: false, reason: existing.unsubscribed_at ? "unsubscribed" : "duplicate" };
  }

  const { data, error } = await supabase
    .from("subscribers")
    .insert({
      restaurant_id: restaurantId,
      email: input.email || null,
      phone: input.phone || null,
      source: "manual",
    })
    .select(LIST_FIELDS)
    .single();
  if (error) {
    // Lost a race against a concurrent insert between the check above and here.
    if (error.code === "23505") return { ok: false, reason: "duplicate" };
    throw error;
  }
  return { ok: true, subscriber: data as unknown as SubscriberListItem };
}

/**
 * Finds a row already holding this email or phone for the restaurant,
 * matching the migration's case-insensitive email index.
 *
 * Two separate .eq() lookups, NOT a single .or() — deliberately (fixed
 * 2026-07-16). An .or() filter string embeds the value in PostgREST's own
 * syntax, where `(`, `)`, `,` and spaces are structural — so
 * `phone.eq.(239) 555-0142` silently matched nothing. That made a
 * suppressed subscriber's re-signup return ok without clearing their
 * suppression (subscribed in their mind, opted-out in ours — the failure
 * this whole design exists to prevent), and gave the owner the wrong 409
 * message on a suppressed re-add. .eq() URL-encodes its value, so any
 * phone/email content is safe.
 */
async function findConflicting(
  supabase: SupabaseClient,
  restaurantId: string,
  input: { email?: string | null; phone?: string | null }
): Promise<{ id: string; unsubscribed_at: string | null } | null> {
  if (input.email) {
    const { data } = await supabase
      .from("subscribers")
      .select("id, unsubscribed_at")
      .eq("restaurant_id", restaurantId)
      .eq("email", input.email.toLowerCase())
      .maybeSingle();
    if (data) return data as { id: string; unsubscribed_at: string | null };
  }
  if (input.phone) {
    const { data } = await supabase
      .from("subscribers")
      .select("id, unsubscribed_at")
      .eq("restaurant_id", restaurantId)
      .eq("phone", input.phone)
      .maybeSingle();
    if (data) return data as { id: string; unsubscribed_at: string | null };
  }
  return null;
}

export async function deleteSubscribers(supabase: SupabaseClient, ids: string[]): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { error } = await supabase.from("subscribers").delete().eq("restaurant_id", restaurantId).in("id", ids);
  if (error) throw error;
}

/**
 * Public homepage signup — no user session exists here (docs/02's public
 * path), so this is one of the few legitimate service-role uses (see
 * src/lib/supabase/admin.ts's allowlist comment). Resolves restaurant_id by
 * slug directly rather than trusting a client-supplied id.
 *
 * The branch that's easy to get wrong: someone who previously unsubscribed and
 * is now signing up again is **re-subscribed** (their `unsubscribed_at`
 * clears). Without that, the unique index would make their insert conflict,
 * they'd be told "you're already on the list", and they'd stay suppressed and
 * never receive anything — subscribed in their mind and opted-out in ours.
 * Them submitting the form is the opt-in.
 *
 * Deliberately does NOT report whether this was a new signup or a repeat.
 * The caller is an unauthenticated, open-CORS route, so any difference it
 * could surface would be a membership oracle (POST an address, learn whether
 * it's on the list). "Already subscribed" and "newly subscribed" are the same
 * end state — on the list — so there's nothing worth telling apart.
 */
export async function createSubscriberPublic(
  slug: string,
  input: SubscribeInput
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const admin = createAdminClient();

  const { data: restaurant } = await admin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!restaurant) return { ok: false, reason: "not_found" };

  const { error } = await admin.from("subscribers").insert({
    restaurant_id: restaurant.id,
    email: input.email || null,
    phone: input.phone || null,
    source: "homepage",
  });

  if (error) {
    if (error.code !== "23505") throw error;

    const existing = await findConflicting(admin, restaurant.id, input);
    if (existing?.unsubscribed_at) {
      await admin.from("subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
    }
  }
  return { ok: true };
}

export interface UnsubscribeTarget {
  /** Partially masked, so a forwarded/leaked link doesn't hand out the full address — the real recipient still recognizes their own. */
  maskedContact: string;
  alreadyUnsubscribed: boolean;
}

/** Masks an email/phone for display on the unsubscribe page. */
function maskContact(email: string | null, phone: string | null): string {
  if (email) {
    const [local, domain] = email.split("@");
    if (!domain) return "•••";
    const head = local.slice(0, 2);
    return `${head}${"•".repeat(Math.max(3, local.length - head.length))}@${domain}`;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    return `•••••${digits.slice(-4)}`;
  }
  return "•••";
}

/** Resolves an unsubscribe link's token for the confirmation page. Read-only on purpose — see the route's note about link prefetchers. */
export async function lookupUnsubscribeToken(token: string): Promise<UnsubscribeTarget | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscribers")
    .select("email, phone, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!data) return null;
  return {
    maskedContact: maskContact(data.email, data.phone),
    alreadyUnsubscribed: !!data.unsubscribed_at,
  };
}

/**
 * Performs the opt-out. The token is the authorization — possession of it
 * proves the holder received the mail — so this needs no session and uses the
 * service-role client, same as the signup insert. Idempotent: unsubscribing
 * twice is a success, not an error, since a second click of the same link is
 * a completely normal thing for someone to do.
 */
export async function unsubscribeByToken(token: string): Promise<UnsubscribeTarget | null> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("subscribers")
    .select("id, email, phone, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!row) return null;

  if (!row.unsubscribed_at) {
    const { error } = await admin
      .from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
  }

  return {
    maskedContact: maskContact(row.email, row.phone),
    alreadyUnsubscribed: !!row.unsubscribed_at,
  };
}

/** Rows the exports are allowed to contact: still subscribed, with the relevant contact field. */
interface ExportableSubscriber {
  email: string | null;
  phone: string | null;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
}

export async function listSubscribersForExport(supabase: SupabaseClient): Promise<ExportableSubscriber[]> {
  const { data, error } = await supabase
    .from("subscribers")
    .select("email, phone, unsubscribed_at, unsubscribe_token")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ExportableSubscriber[]) ?? [];
}

/**
 * CSV of the emails that may actually be mailed — the owner's export need is
 * specifically email addresses, not phone numbers. Two things this must get
 * right, because this file IS the mailing surface until sending is built:
 *   1. Unsubscribed rows are excluded. An opt-out that still lands in the
 *      export isn't an opt-out.
 *   2. Each row carries its own `unsubscribe_url`, so whatever tool sends the
 *      mail can merge it in as a per-recipient field. A tokenized link that
 *      never reaches an email is just a table column.
 * Quoted/escaped per RFC 4180.
 */
export function subscribersToEmailCsv(subscribers: ExportableSubscriber[], origin: string): string {
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const rows = subscribers
    .filter((s) => !!s.email && !s.unsubscribed_at)
    .map((s) => [escape(s.email!), escape(`${origin}/unsubscribe?token=${s.unsubscribe_token}`)].join(","));
  return ["email,unsubscribe_url", ...rows].join("\n");
}

/**
 * CSV of still-subscribed rows that have a phone number, each with its
 * unsubscribe link. This closes docs/09's "phone-only subscribers have a
 * token but no way to receive it" gap: if the owner ever contacts someone by
 * phone manually, the opt-out link is right there to pass along, instead of
 * existing only as an unreachable column. Includes every subscribed row with
 * a phone (not just phone-only ones) so the file is complete for that use.
 *
 * This is NOT an SMS-marketing surface. Nothing in the app sends texts, and
 * Florida's mini-TCPA (§501.059) requires prior express *written* consent
 * that the signup form does not capture — so these numbers can't simply be
 * mass-texted later (docs/09). Same suppression rule as the email export:
 * unsubscribed rows are excluded, because the export is the enforcement point.
 */
export function subscribersToPhoneCsv(subscribers: ExportableSubscriber[], origin: string): string {
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const rows = subscribers
    .filter((s) => !!s.phone && !s.unsubscribed_at)
    .map((s) => [escape(s.phone!), escape(`${origin}/unsubscribe?token=${s.unsubscribe_token}`)].join(","));
  return ["phone,unsubscribe_url", ...rows].join("\n");
}
