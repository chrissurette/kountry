import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getSiteContent } from "@/lib/site/content";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.catering.title} — ${restaurant?.name ?? "Our Restaurant"}` };
}

export default async function CateringPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const { catering } = getSiteContent(locale);
  const t = getDictionary(locale);

  const subject = encodeURIComponent(`Catering inquiry — ${restaurant?.name ?? ""}`.trim());

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      {/* Centered masthead, matching Home/About/Menu — body prose and the
          "What we offer" card below stay left-aligned (readability for the
          prose; card content reads left, matching Home's highlight cards). */}
      <p className="text-center text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        {t.catering.title}
      </p>
      <h1 className="font-site-heading mt-2 text-center text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {catering.lead}
      </h1>

      <div className="mt-6 flex flex-col gap-5 text-base leading-relaxed" style={{ color: "var(--site-text)" }}>
        {catering.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}>
        <h2 className="font-site-heading text-lg font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.catering.whatWeOffer}
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm" style={{ color: "var(--site-text)" }}>
          {catering.offerings.map((o) => (
            <li key={o} className="flex items-start gap-2">
              <span style={{ color: "var(--site-accent)" }}>•</span>
              {o}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 text-center">
        <h2 className="font-site-heading text-xl font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.catering.letsPlanIt}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--site-muted)" }}>
          {t.catering.reachOut}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {restaurant?.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--site-primary)" }}
            >
              {t.catering.callPhone(restaurant.phone)}
            </a>
          )}
          {restaurant?.email && (
            <a
              href={`mailto:${restaurant.email}?subject=${subject}`}
              className="rounded-full border px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              style={{
                borderColor: "var(--site-border)",
                color: "var(--site-primary)",
                background: "color-mix(in srgb, var(--site-primary) 10%, var(--site-surface))",
              }}
            >
              {t.catering.emailUs}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
