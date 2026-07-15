import { createClient } from "@/lib/supabase/server";
import { getRestaurantProfile } from "@/lib/restaurant/service";
import { listCredentials } from "@/lib/providers/keys-service";
import { listTaskConfig } from "@/lib/providers/task-config-service";
import { SettingsForm } from "./settings-form";
import { ProvidersPanel } from "./providers-panel";
import { AccountPanel } from "./account-panel";
import { EmployeePanel } from "./employee-panel";
import { listEmployeeAccounts } from "@/lib/restaurant/employees-service";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [restaurant, credentials, taskConfig] = await Promise.all([
    getRestaurantProfile(supabase),
    listCredentials(supabase),
    listTaskConfig(supabase),
  ]);
  const imageGenConfig = taskConfig.find((t) => t.task === "image_gen");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Self-select RLS (restaurant_members_select_self) lets the owner read their own row.
  const { data: member } = user
    ? await supabase.from("restaurant_members").select("username, role").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const isOwner = member?.role === "owner";
  const employees = isOwner ? await listEmployeeAccounts(restaurant.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Everything here feeds your public site, Daily Specials, and Main Menu — nothing about your
        restaurant is hardcoded in the app.
      </p>
      <SettingsForm restaurant={restaurant} />
      <div className="mt-6">
        <AccountPanel email={user?.email ?? null} currentUsername={member?.username ?? null} />
      </div>
      {employees.length > 0 && (
        <div className="mt-6">
          <EmployeePanel employees={employees} />
        </div>
      )}
      <div className="mt-6">
        <ProvidersPanel
          initialCredentials={credentials}
          initialImageGenConfig={{ provider: imageGenConfig?.provider ?? "openai", model: imageGenConfig?.model ?? "gpt-image-1" }}
        />
      </div>
    </div>
  );
}
