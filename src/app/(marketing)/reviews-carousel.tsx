"use client";

import { useEffect, useRef } from "react";

interface ReviewItem {
  name: string;
  quote: string;
}

function Stars() {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="var(--site-accent)" aria-hidden>
          <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 6 20.4l1.5-6.8L2.3 9l6.9-.7L12 2z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Continuously-drifting reviews marquee for the homepage. The motion is a CSS
 * transform animation (see `.review-marquee-*` in globals.css) — compositor-
 * driven and sub-pixel, so it stays smooth even under main-thread work and
 * doesn't step by whole pixels at slow speeds. The card list is rendered
 * twice; JS measures the exact width of one set (offset of the first
 * duplicated card) and feeds it to the animation as `--marquee-shift`, so the
 * loop is perfectly seamless regardless of card widths. It pauses on hover,
 * focus, or touch; under prefers-reduced-motion the drift is off and it
 * degrades to a manual-scroll row. The About page keeps the static grid.
 */
export function ReviewsCarousel({
  items,
  regionLabel = "Customer reviews",
}: {
  items: readonly ReviewItem[];
  regionLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const viewport = track.parentElement;

    const SPEED = 40; // px per second — a slow, steady drift

    const measure = () => {
      const cards = track.children;
      if (cards.length <= items.length) return;
      const shift = (cards[items.length] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
      if (shift <= 0) return;
      track.style.setProperty("--marquee-shift", `${shift}px`);
      track.style.setProperty("--marquee-duration", `${Math.max(20, Math.round(shift / SPEED))}s`);
    };
    measure();
    window.addEventListener("resize", measure);

    const pause = () => {
      track.style.animationPlayState = "paused";
    };
    const resume = () => {
      track.style.animationPlayState = "running";
    };
    viewport?.addEventListener("pointerenter", pause);
    viewport?.addEventListener("pointerleave", resume);
    viewport?.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    viewport?.addEventListener("focusin", pause);
    viewport?.addEventListener("focusout", resume);

    return () => {
      window.removeEventListener("resize", measure);
      viewport?.removeEventListener("pointerenter", pause);
      viewport?.removeEventListener("pointerleave", resume);
      viewport?.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      viewport?.removeEventListener("focusin", pause);
      viewport?.removeEventListener("focusout", resume);
    };
  }, [items.length]);

  // Rendered twice so the transform loop is seamless; the second set is hidden
  // from assistive tech so reviews aren't announced in duplicate.
  const cards = [...items, ...items];

  return (
    <div className="review-marquee-viewport mt-10 w-full" role="region" aria-label={regionLabel} tabIndex={0}>
      <div ref={trackRef} className="review-marquee-track flex w-max gap-5">
        {cards.map((r, i) => (
          <figure
            key={`${r.name}-${i}`}
            aria-hidden={i >= items.length}
            className="m-0 flex w-[80vw] shrink-0 flex-col gap-3 rounded-2xl border p-6 sm:w-[340px]"
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
    </div>
  );
}
