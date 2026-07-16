import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getSiteContent } from "@/lib/site/content";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";

export const revalidate = 300;

/**
 * The owner's employee application (Microsoft Forms). Deployment-specific, so
 * it sits beside the other in-repo content rather than in the profile row —
 * consistent with the screenshot below, which is necessarily in-repo too
 * (public/jobs/*.webp). Design rule #1 is about identity/branding coming from
 * the profile, and this is neither; but if this app ever goes multi-tenant,
 * this URL *and* the preview image both become per-restaurant data (a profile
 * column + a Storage object), not constants. Called out rather than assumed.
 */
const APPLICATION_URL = "https://forms.cloud.microsoft/r/Xq2ubBhgLp";

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.nav.jobs} — ${restaurant?.name ?? "Our Restaurant"}` };
}

export default async function JobsPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { jobs } = getSiteContent(locale);

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      {/* Centered masthead, left-aligned body prose — same split as
          About/Catering (centering flowing paragraphs hurts readability). */}
      <p className="text-center text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        {t.nav.jobs}
      </p>
      <h1 className="font-site-heading mt-2 text-center text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {jobs.lead}
      </h1>

      <div className="mt-6 flex flex-col gap-5 text-base leading-relaxed" style={{ color: "var(--site-text)" }}>
        {jobs.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* The application: a screenshot of the form's first page, linked to the
          real form (owner's explicit design call, 2026-07-16).
          Two things this must keep doing, because the image shows a checkbox
          and a "Next" button that are only a picture:
            1. applyBody says outright that it's a preview which opens the real
               form — otherwise someone can reasonably think they ticked the
               "I Agree" box by clicking it.
            2. The text link below is not decoration. The image is a picture of
               dense legal text: unreadable to a screen reader (its alt gives
               the link's destination, not its contents) and too small to read
               on a phone. Without a real link this page is a dead end for both.
          NOTE: this image is a *point-in-time copy* of someone else's page. It
          goes stale silently the moment the form is edited — nothing here can
          detect that. Re-capture it if the form changes (see CLAUDE.md for the
          exact headless-Chrome + sharp recipe and the measured crop box). */}
      <section className="mt-12">
        <h2 className="font-site-heading text-center text-2xl font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.jobs.applyHeading}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm" style={{ color: "var(--site-muted)" }}>
          {t.jobs.applyBody}
        </p>

        <a
          href={APPLICATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block overflow-hidden rounded-xl border shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: "var(--site-border)", outlineColor: "var(--site-accent)" }}
        >
          {/* Plain <img> + srcset rather than next/image: no dependency on the
              Netlify image runtime (this project has documented friction
              there), and a phone still gets the 131 KB file instead of the
              296 KB one. Sizes: the container is max-w-3xl minus px-5.
              eslint-disable mirrors the gallery's — a pre-sized static asset,
              intentionally not run through the optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimized static asset with explicit srcset; deliberately not next/image (see above) */}
          <img
            src="/jobs/employee-application-850.webp"
            srcSet="/jobs/employee-application-850.webp 850w, /jobs/employee-application-1700.webp 1700w"
            sizes="(max-width: 768px) 100vw, 728px"
            width={850}
            height={1078}
            alt={t.jobs.formImageAlt}
            className="block h-auto w-full"
          />
        </a>

        <p className="mt-4 text-center text-sm">
          <a
            href={APPLICATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
            style={{ color: "var(--site-accent)" }}
          >
            {t.jobs.openApplication}
          </a>
        </p>
      </section>

      <section className="mt-12 rounded-2xl border p-6" style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}>
        <h2 className="font-site-heading text-lg font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.jobs.whatToExpect}
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm" style={{ color: "var(--site-text)" }}>
          {jobs.expect.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span style={{ color: "var(--site-accent)" }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-site-heading text-lg font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.jobs.equalOpportunity}
        </h2>
        <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed" style={{ color: "var(--site-muted)" }}>
          {jobs.eeo.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section className="mt-10 text-center">
        <h2 className="font-site-heading text-xl font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.jobs.questions}
        </h2>
        {restaurant?.phone && (
          <div className="mt-4">
            <a
              href={`tel:${restaurant.phone}`}
              className="inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--site-primary)" }}
            >
              {t.jobs.callWithQuestions(restaurant.phone)}
            </a>
          </div>
        )}
        {restaurant?.address && (
          <p className="mt-4 text-sm" style={{ color: "var(--site-muted)" }}>
            {t.jobs.stopBy(restaurant.address)}
          </p>
        )}
      </section>
    </main>
  );
}
