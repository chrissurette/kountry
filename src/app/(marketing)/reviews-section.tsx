import { getSiteContent } from "@/lib/site/content";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ReviewsCarousel } from "./reviews-carousel";

function Star({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--site-accent)" aria-hidden>
      <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 6 20.4l1.5-6.8L2.3 9l6.9-.7L12 2z" />
    </svg>
  );
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} />
      ))}
    </span>
  );
}

/**
 * Real Google reviews (src/lib/site/content.ts), shown with attribution. Used
 * on the homepage and About page. Server component — pure content, no client
 * JS needed.
 */
export function ReviewsSection({
  heading,
  eyebrow,
  variant = "grid",
  locale = "en",
}: {
  heading?: string;
  eyebrow?: string;
  variant?: "grid" | "carousel";
  locale?: Locale;
}) {
  const { reviews, established } = getSiteContent(locale);
  const t = getDictionary(locale).reviews;

  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-5 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
          {eyebrow ?? t.eyebrow}
        </p>
        <h2 className="font-site-heading mt-2 text-3xl font-bold sm:text-4xl" style={{ color: "var(--site-primary)" }}>
          {heading ?? t.lovedSince(established)}
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="font-site-heading text-2xl font-bold" style={{ color: "var(--site-primary)" }}>
            {reviews.rating}
          </span>
          <Stars />
          <span className="text-sm" style={{ color: "var(--site-muted)" }}>
            {reviews.count} {t.reviewsOnGoogle}
          </span>
        </div>
      </div>

      {variant === "carousel" ? (
        <ReviewsCarousel items={reviews.items} regionLabel={t.customerReviewsLabel} />
      ) : (
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 px-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.items.map((r) => (
            <figure
              key={r.name}
              className="m-0 flex flex-col gap-3 rounded-2xl border p-6"
              style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}
            >
              <Stars />
              <blockquote className="flex-1 text-sm leading-relaxed" style={{ color: "var(--site-text)" }}>
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="text-sm font-semibold" style={{ color: "var(--site-primary)" }}>
                — {r.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
