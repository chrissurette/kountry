import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DayKey, DeliveryMethod, EmailFaxRequestInput } from "./schema";

export interface EmailFaxRequest {
  id: string;
  restaurant_id: string;
  business_name: string;
  method: DeliveryMethod;
  fax: string | null;
  email: string | null;
  days: DayKey[];
  notes: string | null;
  created_at: string;
}

/**
 * Public form submission — no user session (docs/02's public-write pattern,
 * same as createSubscriberPublic): service-role client, restaurant resolved
 * by slug server-side, never a client-supplied id.
 *
 * Every submission INSERTS — this table is a log by the owner's explicit
 * call, not a deduped list. Repeat/updated requests just add rows; the owner
 * reconciles in /admin/email-fax-list. Spam volume is bounded by the route's
 * honeypot + per-IP rate limit, and the worst case is bulk-deletable, same
 * posture as subscribers before rate limiting existed (docs/07).
 */
export async function createEmailFaxRequestPublic(
  slug: string,
  input: EmailFaxRequestInput
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const admin = createAdminClient();

  const { data: restaurant } = await admin.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!restaurant) return { ok: false, reason: "not_found" };

  const { error } = await admin.from("email_fax_requests").insert({
    restaurant_id: restaurant.id,
    business_name: input.businessName,
    method: input.method,
    // Only persist the contact fields the chosen method actually uses — the
    // form keeps whatever was typed before switching methods, and storing a
    // fax number for an email-only request would both confuse the owner's
    // list and violate the migration's CHECKs' spirit (they only require
    // presence, not absence).
    fax: input.method === "email" ? null : (input.fax ?? null),
    email: input.method === "fax" ? null : (input.email ?? null),
    days: input.days,
    notes: input.notes || null,
  });
  if (error) throw error;
  return { ok: true };
}

/** Owner-facing list — session-scoped client; RLS (owner-only) scopes it. Newest first, like subscribers. */
export async function listEmailFaxRequests(supabase: SupabaseClient): Promise<EmailFaxRequest[]> {
  const { data, error } = await supabase
    .from("email_fax_requests")
    .select("id, restaurant_id, business_name, method, fax, email, days, notes, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as EmailFaxRequest[]) ?? [];
}

export async function deleteEmailFaxRequests(supabase: SupabaseClient, ids: string[]): Promise<void> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { error } = await supabase.from("email_fax_requests").delete().eq("restaurant_id", restaurantId).in("id", ids);
  if (error) throw error;
}
