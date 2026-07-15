import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.nav.order} — ${restaurant?.name ?? "Our Restaurant"}` };
}

// Placeholder until online ordering ships. Phone/email stay the fastest path
// to a real order in the meantime — no dead end for a hungry visitor.
export default async function OrderPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="mx-auto max-w-2xl px-5 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        {t.order.onlineOrdering}
      </p>
      <h1 className="font-site-heading mt-2 text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {t.order.comingSoon}
      </h1>
      <p className="mt-4 text-base" style={{ color: "var(--site-text)" }}>
        {t.order.body}
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {restaurant?.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--site-primary)" }}
          >
            {t.common.callToOrderWith(restaurant.phone)}
          </a>
        )}
        <a
          href="/menu"
          className="rounded-full border px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          style={{
            borderColor: "var(--site-border)",
            color: "var(--site-primary)",
            background: "color-mix(in srgb, var(--site-primary) 10%, var(--site-surface))",
          }}
        >
          {t.order.browseTheMenu}
        </a>
      </div>

      {restaurant?.address && (
        <p className="mt-8 text-sm" style={{ color: "var(--site-muted)" }}>
          {t.order.orderInPerson(restaurant.address)}
        </p>
      )}
    </main>
  );
}
