/**
 * One-time account setup via the Supabase Admin API (robust + reproducible —
 * the recommended alternative to hand-writing auth.users SQL, which is fragile
 * and Supabase-discouraged).
 *
 * What it does:
 *   - Owner: updates the existing owner account's email + password and sets its
 *     username (keeps the same user id, so all history/links stay intact).
 *   - Employee: creates the employee account (or updates it if it already
 *     exists) and links it as role=employee, username=employee.
 *
 * Prerequisites:
 *   - Migrations applied: ..._member_username.sql and ..._member_roles.sql.
 *   - .env.local present with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Passwords come from env vars (never hardcoded). Run from the project root:
 *
 *   PowerShell:
 *     $env:OWNER_PASSWORD='...'; $env:EMPLOYEE_PASSWORD='...'; node scripts/setup-accounts.mjs
 *   bash:
 *     OWNER_PASSWORD='...' EMPLOYEE_PASSWORD='...' node scripts/setup-accounts.mjs
 *
 * Emails/usernames can be overridden with OWNER_EMAIL / OWNER_USERNAME /
 * EMPLOYEE_EMAIL / EMPLOYEE_USERNAME; the defaults match the requested setup.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "kkimmokalee@gmail.com";
const OWNER_USERNAME = (process.env.OWNER_USERNAME ?? "kkimmokalee").toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL ?? "employee@kkimmokalee.com";
const EMPLOYEE_USERNAME = (process.env.EMPLOYEE_USERNAME ?? "employee").toLowerCase();
const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD;

if (!OWNER_PASSWORD || !EMPLOYEE_PASSWORD) {
  console.error("Set OWNER_PASSWORD and EMPLOYEE_PASSWORD env vars before running. See the header comment.");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  // listUsers is paginated; fine for a tiny user set.
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
  const { data: restaurant, error: rErr } = await admin
    .from("restaurants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!restaurant) throw new Error("No restaurant row — run bootstrap_owner.sql first.");

  // --- Owner: update the existing owner account in place ---
  const { data: owners, error: oErr } = await admin
    .from("restaurant_members")
    .select("user_id")
    .eq("role", "owner")
    .limit(1);
  if (oErr) throw oErr;
  if (!owners?.length) throw new Error("No owner member row found — run bootstrap_owner.sql first.");
  const ownerUserId = owners[0].user_id;

  const { error: upErr } = await admin.auth.admin.updateUserById(ownerUserId, {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (upErr) throw upErr;
  await admin.from("restaurant_members").update({ username: OWNER_USERNAME }).eq("user_id", ownerUserId);
  console.log(`✓ Owner updated: ${OWNER_EMAIL} (username: ${OWNER_USERNAME})`);

  // --- Employee: create (or update) + link as role=employee ---
  let employee = await findUserByEmail(EMPLOYEE_EMAIL);
  if (employee) {
    await admin.auth.admin.updateUserById(employee.id, { password: EMPLOYEE_PASSWORD, email_confirm: true });
  } else {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: EMPLOYEE_EMAIL,
      password: EMPLOYEE_PASSWORD,
      email_confirm: true,
    });
    if (cErr) throw cErr;
    employee = created.user;
  }
  const { error: mErr } = await admin
    .from("restaurant_members")
    .upsert(
      { user_id: employee.id, restaurant_id: restaurant.id, role: "employee", username: EMPLOYEE_USERNAME },
      { onConflict: "user_id,restaurant_id" }
    );
  if (mErr) throw mErr;
  console.log(`✓ Employee ready: ${EMPLOYEE_EMAIL} (username: ${EMPLOYEE_USERNAME}, role: employee)`);

  console.log("\nDone. Both accounts can sign in by username or email.");
}

main().catch((err) => {
  console.error("Setup failed:", err.message ?? err);
  process.exit(1);
});
