"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One gallery tile with a smooth load-in (2026-07-16, owner's ask): the
 * aspect-square frame + a soft placeholder render immediately (so scrolling
 * never causes layout shift or white gaps), and the photo fades in over it
 * once its bytes decode.
 *
 * The `complete` check in the effect is load-bearing, not belt-and-braces:
 * for a cached image the browser can finish loading BEFORE React attaches
 * the onLoad handler during hydration — without it, a repeat visitor
 * (year-cached files now) would see permanently invisible photos stuck at
 * opacity-0.
 *
 * First-row tiles come in with eager=true: loading="eager" +
 * fetchpriority="high", paired with the server page's ReactDOM.preload() so
 * the browser starts those downloads from the document head, before it has
 * even reached the grid markup. Everything below stays lazy — that's the
 * "loads as you scroll" behavior, and at ~80–260KB per WebP each tile
 * arrives well inside the fade.
 */
export function GalleryImage({ url, alt, eager }: { url: string; alt: string; eager: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      className="aspect-square overflow-hidden rounded-2xl border"
      style={{
        borderColor: "var(--site-border)",
        background: "linear-gradient(135deg, color-mix(in srgb, var(--site-accent) 14%, var(--site-surface)), var(--site-surface))",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
      <img
        ref={ref}
        src={url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
