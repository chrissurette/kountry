import type { Metadata } from "next";
import Link from "next/link";
import { preload } from "react-dom";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getSiteMedia } from "@/lib/site/media";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { GalleryImage } from "./gallery-image";

// The first grid row is eager + preloaded; everything below lazy-loads on
// scroll. 3 covers the widest first row (sm:grid-cols-3) without competing
// with the page's own critical resources for bandwidth.
const EAGER_COUNT = 3;

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const t = getDictionary(await getLocale());
  return { title: `${t.gallery.title} — ${restaurant?.name ?? "Our Restaurant"}` };
}

// Fallback gradient tiles for when no photos have been uploaded yet in
// /admin/site (the hybrid content decision) — keeps the layout looking
// intentional rather than empty.
const TILE_GRADIENTS = [
  "linear-gradient(135deg, color-mix(in srgb, var(--site-accent) 30%, var(--site-bg)), var(--site-bg))",
  "linear-gradient(135deg, color-mix(in srgb, var(--site-primary) 22%, var(--site-bg)), var(--site-bg))",
  "linear-gradient(135deg, color-mix(in srgb, var(--site-accent) 18%, var(--site-surface)), var(--site-surface))",
  "linear-gradient(160deg, color-mix(in srgb, var(--site-primary) 14%, var(--site-bg)), color-mix(in srgb, var(--site-accent) 14%, var(--site-bg)))",
  "linear-gradient(135deg, color-mix(in srgb, var(--site-accent) 26%, var(--site-surface)), var(--site-bg))",
  "linear-gradient(135deg, color-mix(in srgb, var(--site-primary) 18%, var(--site-surface)), var(--site-surface))",
];

export default async function GalleryPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const photos = restaurant ? await getSiteMedia(restaurant.id, "gallery") : [];

  // React 19 resource preloading from a Server Component: emits
  // <link rel="preload" as="image"> into the document head, so the first
  // row's downloads start before the browser reaches the grid markup.
  for (const photo of photos.slice(0, EAGER_COUNT)) {
    preload(photo.url, { as: "image", fetchPriority: "high" });
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      {/* Centered title/lead, matching Home/About/Menu — the photo grid
          below is untouched (it already fills the container edge-to-edge,
          nothing to center). */}
      <h1 className="font-site-heading text-center text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
        {t.gallery.title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm" style={{ color: "var(--site-muted)" }}>
        {photos.length > 0 ? t.gallery.lead : t.gallery.leadEmpty}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.length > 0
          ? photos.map((photo, i) => (
              <figure key={photo.url} className="m-0">
                <GalleryImage
                  url={photo.url}
                  alt={photo.caption || `${restaurant?.name ?? "Restaurant"} photo ${i + 1}`}
                  eager={i < EAGER_COUNT}
                />
                {photo.caption && (
                  <figcaption className="mt-1.5 text-sm" style={{ color: "var(--site-muted)" }}>
                    {photo.caption}
                  </figcaption>
                )}
              </figure>
            ))
          : TILE_GRADIENTS.map((g, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl border"
                style={{ background: g, borderColor: "var(--site-border)" }}
                aria-label={t.gallery.photoComingSoon}
              />
            ))}
      </div>

      <p className="mt-10 text-center text-sm">
        <Link href="/menu" className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
          {t.gallery.hungrySeeMenu}
        </Link>
      </p>
    </main>
  );
}
