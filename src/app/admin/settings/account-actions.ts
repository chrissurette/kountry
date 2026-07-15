"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AccountState {
  status: "idle" | "success" | "error";
  field?: "username" | "password";
  message?: string;
}

// 3–30 chars, lowercase letters/numbers/hyphen/underscore, no leading/trailing separator.
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/;

export async function changeUsername(_prevState: AccountState, formData: FormData): Promise<AccountState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return {
      status: "error",
      field: "username",
      message: "3–30 characters: lowercase letters, numbers, hyphen or underscore.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", field: "username", message: "You're not signed in." };

  // restaurant_members has no UPDATE RLS policy, so this goes through the
  // service-role client — scoped to the verified session user's own row.
  const admin = createAdminClient();

  const { data: taken } = await admin
    .from("restaurant_members")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (taken && taken.user_id !== user.id) {
    return { status: "error", field: "username", message: "That username is already taken." };
  }

  const { error } = await admin.from("restaurant_members").update({ username }).eq("user_id", user.id);
  if (error) return { status: "error", field: "username", message: "Could not save the username." };

  revalidatePath("/admin/settings");
  return { status: "success", field: "username", message: `Saved — you can now sign in as "${username}".` };
}

export async function changePassword(_prevState: AccountState, formData: FormData): Promise<AccountState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { status: "error", field: "password", message: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { status: "error", field: "password", message: "The two passwords don't match." };
  }

  // updateUser acts on the signed-in user (session read from cookies), so this
  // only ever changes the current owner's own password.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", field: "password", message: "You're not signed in." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", field: "password", message: error.message };

  return { status: "success", field: "password", message: "Password updated." };
}
