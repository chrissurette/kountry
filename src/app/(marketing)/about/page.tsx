import type { Metadata } from "next";
import Link from "next/link";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getSiteContent } from "@/lib/site/content";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ReviewsSection } from "../reviews-section";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.about.ourStory} — ${restaurant?.name ?? "Our Restaurant"}` };
}

export default async function AboutPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const siteContent = getSiteContent(locale);
  const t = getDictionary(locale);

  return (
    <>
    <main className="mx-auto max-w-3xl px-5 py-16">
      {/* Centered masthead (kicker/name/lead) + CTA row, matching the
          centered treatment Home's hero and the Menu page's headings use —
          but the body prose below stays left-aligned; centering multi-line
          paragraphs hurts readability, it's not just a style choice. */}
      <p className="text-center text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        {t.about.ourStory}
      </p>
      <h1 className="font-site-heading mt-2 text-center text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {restaurant?.name ?? "Our Restaurant"}
      </h1>
      <p className="font-site-heading mt-4 text-center text-xl italic" style={{ color: "var(--site-text)" }}>
        {siteContent.about.lead}
      </p>

      <div className="mt-8 flex flex-col gap-5 text-base leading-relaxed" style={{ color: "var(--site-text)" }}>
        {siteContent.about.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/menu"
          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{ background: "var(--site-primary)" }}
        >
          {t.about.seeTheMenu}
        </Link>
        <Link
          href="/visit"
          className="rounded-full border px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          style={{
            borderColor: "var(--site-border)",
            color: "var(--site-primary)",
            background: "color-mix(in srgb, var(--site-primary) 10%, var(--site-surface))",
          }}
        >
          {t.about.planAVisit}
        </Link>
      </div>
    </main>

    <ReviewsSection heading={t.about.whatGuestsSay} locale={locale} />
    </>
  );
}
