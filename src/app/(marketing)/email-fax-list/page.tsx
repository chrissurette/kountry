import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getSiteContent } from "@/lib/site/content";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { EmailFaxForm } from "./email-fax-form";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.nav.emailFaxList} — ${restaurant?.name ?? "Our Restaurant"}` };
}

/**
 * Daily-special delivery signup — a NATIVE form logging to our own
 * `email_fax_requests` table (owner's pivot, 2026-07-16; this replaced both
 * the placeholder and the earlier plan to link the owner's Microsoft Form).
 * This page collects customer PII, so its factual claims live on /privacy
 * too — change one, change both (CLAUDE.md's standing rule).
 */
export default async function EmailFaxListPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { emailFax } = getSiteContent(locale);

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-center text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        {t.nav.emailFaxList}
      </p>
      <h1 className="font-site-heading mt-2 text-center text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {emailFax.lead}
      </h1>

      <div className="mt-6 flex flex-col gap-5 text-base leading-relaxed" style={{ color: "var(--site-text)" }}>
        {emailFax.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border p-6 sm:p-8" style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}>
        {restaurant && <EmailFaxForm restaurantSlug={restaurant.slug} locale={locale} />}
      </div>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--site-muted)" }}>
        {t.emailFax.removalNote}
      </p>
    </main>
  );
}
