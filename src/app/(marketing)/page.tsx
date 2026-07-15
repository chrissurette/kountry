import type { Metadata } from "next";
import Link from "next/link";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getSiteMedia } from "@/lib/site/media";
import { getLiveMenuPayload, localizedSpecialsImageUrl } from "@/lib/public-menu/service";
import { getSiteContent } from "@/lib/site/content";
import { directionsUrl } from "@/lib/site/social";
import { groupHoursByDay, formatTime } from "@/lib/site/hours";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { OpenNowBadge } from "./open-now-badge";
import { SpecialsPreview } from "./specials-preview";
import { ReviewsSection } from "./reviews-section";

// The specials preview refreshes on the same 60s ISR window as the menu
// page; on-demand revalidation (src/lib/publish/service.ts) also fires on
// publish so it shows up instantly rather than waiting out that window.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const siteContent = getSiteContent(locale);
  const name = restaurant?.name ?? "Our Restaurant";
  return {
    title: `${name} — ${siteContent.tagline}`,
    description: siteContent.heroBody,
  };
}

export default async function HomePage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const siteContent = getSiteContent(locale);
  const t = getDictionary(locale);
  const payload = restaurant ? await getLiveMenuPayload(restaurant.slug) : null;
  const heroPhotos = restaurant ? await getSiteMedia(restaurant.id, "hero") : [];
  const heroUrl = heroPhotos[0]?.url;

  const specialsImageUrl = localizedSpecialsImageUrl(payload, locale);
  const hasSpecials = !!specialsImageUrl;
  const week = groupHoursByDay(restaurant?.hours ?? [], locale);
  const hasHours = (restaurant?.hours?.length ?? 0) > 0;

  // The specials preview takes the hero's right slot whenever there ARE
  // specials (freshness wins), or when there's nothing else to show there
  // (its own empty state beats a blank slot). The uploaded hero photo, if
  // any, only steps in on days with no specials posted yet — so a nice
  // photo still gets shown instead of "check back soon" placeholder text.
  const showSpecialsInHero = hasSpecials || !heroUrl;
  const showHeroPhoto = !showSpecialsInHero && !!heroUrl;
  const hasRightSlot = showSpecialsInHero || showHeroPhoto;

  return (
    <main>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 120% at 80% 0%, color-mix(in srgb, var(--site-accent) 18%, var(--site-bg)) 0%, var(--site-bg) 55%)",
        }}
      >
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24 xl:max-w-6xl 2xl:max-w-7xl">
          {/* Below lg: plain document flow, so these render top-to-bottom in
              source order (intro, subtext, specials/hero art, then CTAs) —
              the specials thumbnail sits right after the hero subtext on
              tablet and mobile. At lg+, the container becomes a 2-col grid
              and the art block is explicitly placed into column 2, spanning
              all 3 rows of column 1 (see its col-start/row-start/row-span).
              xl:gap-x-16 widens the breathing room between text and art to
              match the wider container above, rather than leaving them
              bunched together in the middle of extra margin. */}
          <div className={hasRightSlot ? "lg:grid lg:items-center lg:gap-x-10 lg:grid-cols-[1.1fr_1fr] xl:gap-x-16" : ""}>
            {/* Centered while stacked (below lg) to match the specials
                card/CTA row below it — reverts to left-aligned at lg+, where
                this sits beside the art in a 2-col row instead of alone in a
                single column. */}
            <div className="mx-auto max-w-md text-center lg:mx-0 lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
                {siteContent.heroKicker}
              </p>
              <h1
                className="font-site-heading mt-2 text-4xl font-bold leading-[1.05] sm:text-5xl"
                style={{ color: "var(--site-primary)" }}
              >
                {restaurant?.name ?? "Our Restaurant"}
              </h1>
              <p className="font-site-heading mt-3 text-lg italic sm:text-xl" style={{ color: "var(--site-text)" }}>
                {siteContent.tagline}
              </p>
            </div>

            <p className="mx-auto mt-3 max-w-md text-center text-base lg:mx-0 lg:text-left" style={{ color: "var(--site-muted)" }}>
              {siteContent.heroBody}
            </p>

            {showSpecialsInHero && (
              <div className="mt-6 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:mt-0">
                <SpecialsPreview restaurantName={restaurant?.name ?? "Our Restaurant"} imageUrl={specialsImageUrl} locale={locale} />
              </div>
            )}

            {showHeroPhoto && (
              <div className="mt-6 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:mt-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
                <img
                  src={heroUrl}
                  alt={restaurant?.name ?? "Restaurant"}
                  className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg lg:aspect-square"
                />
              </div>
            )}

            <div className="mx-auto mt-6 max-w-md text-center lg:mx-0 lg:mt-7 lg:text-left">
              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                {!hasRightSlot && (
                  <Link
                    href="/menu"
                    className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                    style={{ background: "var(--site-primary)" }}
                  >
                    {t.home.viewTheMenu}
                  </Link>
                )}
                {restaurant?.address && (
                  <a
                    href={directionsUrl(restaurant.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--site-border)",
                      color: "var(--site-primary)",
                      background: "color-mix(in srgb, var(--site-primary) 10%, var(--site-surface))",
                    }}
                  >
                    {t.common.getDirections}
                  </a>
                )}
                {restaurant?.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="rounded-full border px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--site-border)",
                      color: "var(--site-primary)",
                      background: "color-mix(in srgb, var(--site-primary) 10%, var(--site-surface))",
                    }}
                  >
                    {t.common.callToOrderWith(restaurant.phone)}
                  </a>
                )}
              </div>

              {hasHours && (
                <div className="mt-6">
                  <OpenNowBadge hours={restaurant!.hours} locale={locale} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-5xl px-5 py-16 xl:max-w-6xl 2xl:max-w-7xl">
        <div className="grid gap-6 sm:grid-cols-3 xl:gap-8">
          {siteContent.highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-2xl border p-6"
              style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}
            >
              <h3 className="font-site-heading text-lg font-semibold" style={{ color: "var(--site-primary)" }}>
                {h.title}
              </h3>
              <p className="mt-2 text-sm" style={{ color: "var(--site-muted)" }}>
                {h.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <ReviewsSection variant="carousel" locale={locale} />

      {/* Visit strip */}
      <section className="mx-auto max-w-5xl px-5 pb-20 xl:max-w-6xl 2xl:max-w-7xl">
        <div
          className="grid gap-8 rounded-3xl px-8 py-10 sm:grid-cols-2 xl:gap-12 xl:px-12 xl:py-14"
          style={{ background: "color-mix(in srgb, var(--site-primary) 6%, var(--site-bg))" }}
        >
          <div>
            <h2 className="font-site-heading text-2xl font-bold" style={{ color: "var(--site-primary)" }}>
              {t.home.comeSeeUs}
            </h2>
            {restaurant?.address && (
              <p className="mt-3 text-sm" style={{ color: "var(--site-text)" }}>
                {restaurant.address}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {restaurant?.address && (
                <a
                  href={directionsUrl(restaurant.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--site-accent)" }}
                >
                  {t.home.getDirectionsArrow}
                </a>
              )}
              <Link href="/visit" className="text-sm font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
                {t.common.hoursAndContact}
              </Link>
            </div>
          </div>

          {hasHours && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--site-muted)" }}>
                  {t.common.hours}
                </h3>
                <OpenNowBadge hours={restaurant!.hours} locale={locale} />
              </div>
              <dl className="text-sm">
                {week.map((d) => (
                  <div key={d.day} className="flex justify-between border-b py-1.5" style={{ borderColor: "var(--site-border)" }}>
                    <dt style={{ color: "var(--site-text)" }}>{d.full}</dt>
                    <dd style={{ color: "var(--site-muted)" }}>
                      {d.ranges.length === 0
                        ? t.common.closed
                        : d.ranges.map((r) => `${formatTime(r.open)}–${formatTime(r.close)}`).join(", ")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
