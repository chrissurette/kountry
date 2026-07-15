"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";

export interface SignInState {
  status: "idle" | "error";
  message?: string;
}

/**
 * Email + username sign-in. The owner's user is created once in the Supabase
 * dashboard (Auth → Users → Add user, with a password) and linked to the
 * restaurant via a restaurant_members row; an optional `username` on that row
 * is an alternate login identifier (docs/04).
 *
 * If the identifier isn't an email (no "@"), we resolve the username to the
 * account's email with the service-role client — there's no session yet, so
 * RLS would otherwise hide the row. Then signInWithPassword sets the session
 * cookie via the server client and we land in the admin tool. On any failure
 * the message stays deliberately vague (no username/email enumeration).
 */
export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const t = getDictionary(await getLocale()).admin.login;

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) {
    return { status: "error", message: t.errorMissingFields };
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("restaurant_members")
      .select("user_id")
      .eq("username", identifier.toLowerCase())
      .maybeSingle();
    if (member?.user_id) {
      const { data } = await admin.auth.admin.getUserById(member.user_id);
      if (data?.user?.email) email = data.user.email;
    }
    // If unresolved, email stays a non-email string → sign-in fails below with
    // the same generic message, so a bad username can't be distinguished.
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: t.errorGeneric };
  }

  redirect("/admin");
}
