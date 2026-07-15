import { createAdminClient } from "@/lib/supabase/admin";

export interface EmployeeAccount {
  userId: string;
  email: string | null;
  username: string | null;
}

/**
 * Lists every 'employee' member of a restaurant, with their auth email.
 * Uses the service-role client because restaurant_members' self-SELECT RLS
 * policy (restaurant_members_select_self) only lets a session see its own
 * row — an owner managing OTHER members' accounts needs this. Only ever
 * called after the caller's own owner role has been verified (settings/page.tsx,
 * employee-actions.ts) — never exposed directly to a client component.
 */
export async function listEmployeeAccounts(restaurantId: string): Promise<EmployeeAccount[]> {
  const admin = createAdminClient();
  const { data: members, error } = await admin
    .from("restaurant_members")
    .select("user_id, username")
    .eq("restaurant_id", restaurantId)
    .eq("role", "employee");
  if (error) throw error;
  if (!members?.length) return [];

  const accounts: EmployeeAccount[] = [];
  for (const m of members) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    accounts.push({ userId: m.user_id, email: data?.user?.email ?? null, username: m.username });
  }
  return accounts;
}
