import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/auth/current-restaurant";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getAiSpendStatus } from "@/lib/rate-limit";
import { AdminNav } from "./admin-nav";

// The PWA manifest is attached here, not in the root layout, so "install app"
// is offered for the staff tool (scoped to /admin) — never for the public
// marketing site that now lives at the root.
export const metadata: Metadata = {
  title: "MyMenuAgent",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyMenuAgent",
  },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const restaurant = await getCurrentRestaurant();
  const locale = await getLocale();

  // Drives which nav links show; the hard enforcement is in src/proxy.ts's
  // middleware (employees are redirected/403'd away from non-generator routes).
  const { data: member } = await supabase.from("restaurant_members").select("role").eq("user_id", user.id).maybeSingle();
  const role = (member?.role as "owner" | "employee" | undefined) ?? "owner";

  if (!restaurant) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">Almost there</h1>
        <p className="text-sm text-neutral-500">
          Your account is signed in, but no restaurant profile is linked to it yet. Ask whoever set up
          MyMenuAgent to run the bootstrap step (<code>supabase/seed/bootstrap_owner.sql</code>) for your
          account.
        </p>
      </main>
    );
  }

  // AI spend/loop alert banner (2026-07-16, owner's ask): the 429 message
  // only reaches whoever made the request — during a real runaway loop that's
  // a script, not a person — so the warning has to live where staff actually
  // look. Renders on EVERY admin screen; fail-soft (null = no banner, layout
  // never breaks — the social-panel lesson). Escalation: warn at 50% of the
  // daily budget (the earliest honest slow-leak signal), red at the cap or
  // while requests are actively being denied this hour.
  const spend = await getAiSpendStatus(restaurant.id);
  const t = getDictionary(locale).admin.aiAlert;
  const banner =
    spend && (spend.activeDenials || spend.capped)
      ? { text: spend.activeDenials ? t.blocked : t.capped, className: "border-red-300 bg-red-50 text-red-900" }
      : spend?.warn
        ? {
            text: t.warn(`$${spend.spentTodayUsd.toFixed(2)}`, `$${spend.ceilingUsd.toFixed(0)}`),
            className: "border-amber-300 bg-amber-50 text-amber-900",
          }
        : null;

  return (
    <div className="min-h-dvh">
      <AdminNav restaurantName={restaurant.name} role={role} locale={locale} />
      {banner && (
        <div role="alert" className={`border-b px-4 py-2.5 text-sm font-medium sm:px-6 ${banner.className}`}>
          {banner.text}
        </div>
      )}
      <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
