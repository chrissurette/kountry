import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { groupHoursByDay, formatTime } from "@/lib/site/hours";
import { socialLinks, directionsUrl } from "@/lib/site/social";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { OpenNowBadge } from "../open-now-badge";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.visit.title} — ${restaurant?.name ?? "Our Restaurant"}` };
}

export default async function VisitPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const week = groupHoursByDay(restaurant?.hours ?? [], locale);
  const hasHours = (restaurant?.hours?.length ?? 0) > 0;
  const socials = socialLinks(restaurant?.social);

  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      {/* Centered page title, matching Home/About/Menu — the 2-col info grid
          below stays left-aligned (an address and an hours table shouldn't
          be centered). */}
      <h1 className="font-site-heading text-center text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {t.visit.title}
      </h1>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        {/* Location & contact */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--site-muted)" }}>
            {t.visit.findUs}
          </h2>
          {restaurant?.address ? (
            <>
              <p className="mt-3 text-lg" style={{ color: "var(--site-text)" }}>
                {restaurant.address}
              </p>
              <a
                href={directionsUrl(restaurant.address)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--site-primary)" }}
              >
                {t.common.getDirections}
              </a>
            </>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--site-muted)" }}>
              {t.visit.addressComingSoon}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2 text-sm">
            {restaurant?.phone && (
              <a href={`tel:${restaurant.phone}`} className="hover:underline" style={{ color: "var(--site-text)" }}>
                📞 {restaurant.phone}
              </a>
            )}
            {restaurant?.email && (
              <a href={`mailto:${restaurant.email}`} className="hover:underline" style={{ color: "var(--site-text)" }}>
                ✉️ {restaurant.email}
              </a>
            )}
          </div>

          {socials.length > 0 && (
            <div className="mt-6 flex gap-4 text-sm">
              {socials.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Hours */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--site-muted)" }}>
              {t.common.hours}
            </h2>
            {hasHours && <OpenNowBadge hours={restaurant!.hours} locale={locale} />}
          </div>
          {hasHours ? (
            <dl className="mt-3">
              {week.map((d) => (
                <div key={d.day} className="flex justify-between border-b py-2" style={{ borderColor: "var(--site-border)" }}>
                  <dt style={{ color: "var(--site-text)" }}>{d.full}</dt>
                  <dd style={{ color: "var(--site-muted)" }}>
                    {d.ranges.length === 0
                      ? t.common.closed
                      : d.ranges.map((r) => `${formatTime(r.open)}–${formatTime(r.close)}`).join(", ")}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--site-muted)" }}>
              {t.visit.hoursComingSoon}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
