import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/auth/current-restaurant";
import { getLocale } from "@/lib/i18n/get-locale";
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

  return (
    <div className="min-h-dvh">
      <AdminNav restaurantName={restaurant.name} role={role} locale={locale} />
      <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
