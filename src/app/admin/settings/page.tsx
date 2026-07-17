import { createClient } from "@/lib/supabase/server";
import { getRestaurantProfile } from "@/lib/restaurant/service";
import { listCredentials } from "@/lib/providers/keys-service";
import { listTaskConfig } from "@/lib/providers/task-config-service";
import { SettingsForm } from "./settings-form";
import { ProvidersPanel } from "./providers-panel";
import { AccountPanel } from "./account-panel";
import { EmployeePanel } from "./employee-panel";
import { SocialPanel } from "./social-panel";
import { listEmployeeAccounts } from "@/lib/restaurant/employees-service";
import { listPublishTargets, listRecentSocialPosts } from "@/lib/social/targets-service";
import { metaAppCredentials } from "@/lib/env";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ social?: string }> }) {
  const supabase = await createClient();
  const [restaurant, credentials, taskConfig, socialTargets, recentSocialPosts, { social: socialFlag }] =
    await Promise.all([
      getRestaurantProfile(supabase),
      listCredentials(supabase),
      listTaskConfig(supabase),
      listPublishTargets(supabase),
      listRecentSocialPosts(supabase),
      searchParams,
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
      {/* Beside AI Providers (owner's placement call, docs/10) — same idea:
          the owner connecting their own third-party account to this app. */}
      <div className="mt-6">
        <SocialPanel
          targets={socialTargets}
          recentPosts={recentSocialPosts}
          configured={metaAppCredentials() !== null}
          statusFlag={socialFlag ?? null}
        />
      </div>
    </div>
  );
}
