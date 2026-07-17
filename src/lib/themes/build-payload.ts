import type { BrandConfig, Restaurant, Theme, MenuSnapshotPayload } from "@/types/database";
import type { MenuWithContent } from "@/lib/menu/service";

/**
 * Resolves (restaurant profile, menu content, theme) into the self-contained
 * MenuSnapshotPayload shape (docs/03) at publish time (src/lib/publish/service.ts).
 * `imageUrl` carries the AI-generated Daily Special image (docs/05's image
 * pipeline) — the normal case today. `imageUrlEs` is the same, translated
 * (docs/08) — null unless the owner has rendered a Spanish version.
 * `styleOverrides`/`sections`/`theme`
 * are legacy fields from the retired OCR-to-text pipeline, kept so
 * historical published_snapshots rows (and History's live preview,
 * src/app/admin/history/history-list.tsx) still render correctly; nothing
 * writes non-empty values for them anymore. This function has no
 * server-only imports, so it's safe to call from a client component too.
 */
export function buildMenuSnapshotPayload(
  restaurant: Restaurant,
  menu: MenuWithContent,
  theme: Pick<Theme, "key" | "config">,
  styleOverrides?: Partial<BrandConfig>,
  imageUrl?: string | null,
  imageUrlEs?: string | null,
  /** Social crosspost JPEGs (docs/10), frozen in here so a *scheduled* publish posts exactly what was approved — the cron has no browser to re-compose them at fire time. */
  socialImages?: { imageUrl?: string | null; imageIgUrl?: string | null }
): MenuSnapshotPayload {
  return {
    restaurant: {
      slug: restaurant.slug,
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      hours: restaurant.hours,
      social: restaurant.social,
      brand: restaurant.brand,
      menu_defaults: restaurant.menu_defaults,
    },
    menu: {
      title: menu.title,
      service_date: menu.service_date,
      sections: menu.menu_sections.map((section) => ({
        name: section.name,
        items: section.menu_items.map((item) => ({
          name: item.name,
          description: item.description,
          price_cents: item.price_cents,
          price_note: item.price_note,
        })),
      })),
      imageUrl: imageUrl ?? null,
      imageUrlEs: imageUrlEs ?? null,
      socialImageUrl: socialImages?.imageUrl ?? null,
      socialImageIgUrl: socialImages?.imageIgUrl ?? null,
    },
    theme: {
      key: theme.key,
      config: theme.config,
    },
    styleOverrides: styleOverrides ?? menu.style_overrides ?? {},
  };
}
