"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EmployeeAccountState {
  status: "idle" | "success" | "error";
  message?: string;
}

// 3–30 chars, lowercase letters/numbers/hyphen/underscore, no leading/trailing separator.
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verifies the signed-in caller is the target employee's restaurant's owner.
 * The route itself is already owner-only (employees are redirected away from
 * /admin/settings by src/lib/supabase/middleware.ts before any action here
 * could run), but every action re-checks here too — these use the
 * service-role client to modify ANOTHER user's auth record, so they must
 * never trust the route boundary alone. Throws a plain Error on failure;
 * every action below turns that into a form error, not a stack trace.
 */
async function assertOwnerManagesEmployee(employeeUserId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You're not signed in.");

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("restaurant_members")
    .select("restaurant_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (caller?.role !== "owner") throw new Error("Only the owner can manage employee accounts.");

  const { data: target } = await admin
    .from("restaurant_members")
    .select("restaurant_id, role")
    .eq("user_id", employeeUserId)
    .maybeSingle();
  if (!target || target.restaurant_id !== caller.restaurant_id || target.role !== "employee") {
    throw new Error("That account isn't an employee of your restaurant.");
  }
}

export async function updateEmployeeUsername(
  _prevState: EmployeeAccountState,
  formData: FormData
): Promise<EmployeeAccountState> {
  const userId = String(formData.get("userId") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return { status: "error", message: "3–30 characters: lowercase letters, numbers, hyphen or underscore." };
  }

  try {
    await assertOwnerManagesEmployee(userId);
    const admin = createAdminClient();

    const { data: taken } = await admin
      .from("restaurant_members")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();
    if (taken && taken.user_id !== userId) {
      return { status: "error", message: "That username is already taken." };
    }

    const { error } = await admin.from("restaurant_members").update({ username }).eq("user_id", userId);
    if (error) throw error;
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Could not save the username." };
  }

  revalidatePath("/admin/settings");
  return { status: "success", message: `Saved — they can now sign in as "${username}".` };
}

export async function updateEmployeeEmail(
  _prevState: EmployeeAccountState,
  formData: FormData
): Promise<EmployeeAccountState> {
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  try {
    await assertOwnerManagesEmployee(userId);
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) throw error;
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Could not update the email." };
  }

  revalidatePath("/admin/settings");
  return { status: "success", message: "Email updated." };
}

export async function updateEmployeePassword(
  _prevState: EmployeeAccountState,
  formData: FormData
): Promise<EmployeeAccountState> {
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { status: "error", message: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { status: "error", message: "The two passwords don't match." };
  }

  try {
    await assertOwnerManagesEmployee(userId);
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Could not update the password." };
  }

  return { status: "success", message: "Password updated." };
}
