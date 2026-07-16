import type { Metadata } from "next";
import Link from "next/link";
import { getSiteRestaurant } from "@/lib/site/restaurant";
import { getLiveMenuPayload, localizedSpecialsImageUrl } from "@/lib/public-menu/service";
import { getMainMenuForSlug, type PublicMainMenuSection } from "@/lib/public-main-menu/service";
import { formatPrice } from "@/lib/themes/format";
import { directionsUrl } from "@/lib/site/social";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { MenuItemImagePopover } from "./menu-item-image-popover";
import { SpecialImage } from "./special-image";
import type { MainMenuCategory } from "@/types/database";

// The always-current page. Renders site-native (cohesive with the marketing
// chrome) — the per-menu theme concept only remains relevant for History's
// live preview of past snapshots now. 60s ISR + on-demand revalidation
// (src/lib/publish/service.ts) means a publish is reflected right away.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const name = restaurant?.name ?? t.menu.title;
  return { title: `${t.menu.title} — ${name}` };
}

const CATEGORY_ORDER: MainMenuCategory[] = ["breakfast", "lunch_dinner", "beverages"];

function ItemRow({
  name,
  description,
  price,
  imageUrl,
}: {
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="min-w-0">
        <span className="font-medium" style={{ color: "var(--site-text)" }}>
          {imageUrl ? <MenuItemImagePopover imageUrl={imageUrl}>{name}</MenuItemImagePopover> : name}
        </span>
        {description && (
          <p className="mt-0.5 text-sm" style={{ color: "var(--site-muted)" }}>
            {description}
          </p>
        )}
      </div>
      <span className="mx-3 flex-1 border-b border-dotted" style={{ borderColor: "var(--site-border)" }} aria-hidden />
      <span className="whitespace-nowrap font-semibold" style={{ color: "var(--site-accent)" }}>
        {price}
      </span>
    </div>
  );
}

/** Spanish text if the locale is es AND a translation exists; English otherwise — never a blank field just because a translation is missing. */
function localize(locale: Locale, en: string, es: string | null): string {
  return locale === "es" && es ? es : en;
}
function localizeNullable(locale: Locale, en: string | null, es: string | null): string | null {
  return locale === "es" && es ? es : en;
}

function MenuSection({ section, currency, locale }: { section: PublicMainMenuSection; currency: string; locale: Locale }) {
  const description = localizeNullable(locale, section.description, section.descriptionEs);
  return (
    <section>
      <h3 className="font-site-heading mb-1 text-center text-2xl font-semibold" style={{ color: "var(--site-primary)" }}>
        {localize(locale, section.name, section.nameEs)}
      </h3>
      {description && (
        <p className="mx-auto mb-5 max-w-xl text-center text-sm italic" style={{ color: "var(--site-muted)" }}>
          {description}
        </p>
      )}
      {!description && <div className="mb-5" />}
      <div className="flex flex-col gap-5">
        {section.items.map((item, j) => (
          <ItemRow
            key={j}
            name={localize(locale, item.name, item.nameEs)}
            description={localizeNullable(locale, item.description, item.descriptionEs)}
            price={formatPrice(item.price_cents, item.price_note, currency)}
            imageUrl={item.imageUrl}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryHeading({ id, label }: { id: string; label: string }) {
  return (
    <div id={id} className="scroll-mt-28 text-center">
      <h2 className="font-site-heading text-3xl font-bold sm:text-4xl" style={{ color: "var(--site-primary)" }}>
        {label}
      </h2>
      <div className="mx-auto mt-3 h-1 w-16 rounded-full" style={{ background: "var(--site-accent)" }} />
    </div>
  );
}

export default async function MenuPage() {
  const restaurant = await getSiteRestaurant();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const categoryLabel: Record<MainMenuCategory, string> = {
    breakfast: t.menu.breakfast,
    lunch_dinner: t.menu.lunchDinner,
    beverages: t.menu.beverages,
  };
  const mainMenuSections = restaurant ? await getMainMenuForSlug(restaurant.slug) : null;
  const payload = restaurant ? await getLiveMenuPayload(restaurant.slug) : null;
  const currency = restaurant?.menu_defaults.currency ?? "USD";

  const hasMainMenu = (mainMenuSections?.length ?? 0) > 0;
  const specialsImageUrl = localizedSpecialsImageUrl(payload, locale);
  const hasSpecials = !!specialsImageUrl;
  const taxNote = restaurant?.menu_defaults.taxNote;
  const disclaimer = restaurant?.menu_defaults.disclaimer;

  const byCategory = new Map<MainMenuCategory, PublicMainMenuSection[]>();
  for (const section of mainMenuSections ?? []) {
    const list = byCategory.get(section.category) ?? [];
    list.push(section);
    byCategory.set(section.category, list);
  }
  const presentCategories = CATEGORY_ORDER.filter((c) => (byCategory.get(c)?.length ?? 0) > 0);

  const jumpLinks = [
    ...(hasSpecials ? [{ id: "specials", label: t.menu.todaysSpecials }] : []),
    ...presentCategories.map((c) => ({ id: c.replace("_", "-"), label: categoryLabel[c] })),
  ];

  return (
    <main className="mx-auto max-w-4xl px-5 py-14">
      <header className="text-center">
        <h1 className="font-site-heading text-4xl font-bold sm:text-5xl" style={{ color: "var(--site-primary)" }}>
          {t.menu.title}
        </h1>
      </header>

      {jumpLinks.length > 1 && (
        // A single-row, horizontally-scrollable chip strip rather than a
        // wrapping bar: on a narrow viewport, wrapping to 2 rows roughly
        // doubles this sticky bar's height, and the section headings'
        // scroll-mt-28 below (sized for the one-row case) is no longer
        // enough clearance — the heading ends up hidden behind the wrapped
        // bar after a jump. Shrink-to-fit + max-w-full + overflow-x-auto
        // keeps the bar's height constant at every breakpoint, so the fixed
        // scroll-mt offset is always correct. no-scrollbar (globals.css)
        // keeps native touch/wheel scrolling without a visible track.
        <nav
          className="no-scrollbar scroll-fade-x sticky top-14 z-20 mx-auto mt-8 flex w-fit max-w-full flex-nowrap items-center gap-0 overflow-x-auto rounded-full border px-0.5 py-1 text-xs backdrop-blur md:gap-2 md:px-2 md:py-2 md:text-sm"
          style={{ borderColor: "var(--site-border)", background: "color-mix(in srgb, var(--site-bg) 90%, transparent)" }}
        >
          {/* Compact below md (phones only — a real tablet at 768px+ has
              plenty of room even at full size, measured live) so all jump
              links — including a 4th/5th category like Beverages — are more
              likely to fit in the single row without relying on horizontal
              scroll; still falls back to scroll+fade (above) for whatever
              doesn't fit, rather than wrapping to a 2nd row (that broke the
              sticky bar's height / scroll-mt offset, see the note above).
              (Tried letting this bar bleed past main's own side padding via
              max-w-[calc(100%+…)] to claw back a few more px — measured live
              and it broke centering and caused real page overflow, since
              mx-auto's "split remaining space evenly" only holds reliably
              when content actually fits; reverted to max-w-full, which is
              bounded and safe, and leaned on tighter spacing/type-size
              instead.) */}
          {jumpLinks.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="shrink-0 whitespace-nowrap rounded-full px-1 py-1 font-medium transition-colors hover:bg-black/5 md:px-3 md:py-1.5"
              style={{ color: "var(--site-primary)" }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}

      {!hasMainMenu && !hasSpecials ? (
        <div
          className="mx-auto mt-12 max-w-md rounded-2xl border p-8 text-center"
          style={{ borderColor: "var(--site-border)", background: "var(--site-surface)" }}
        >
          <p className="font-medium" style={{ color: "var(--site-text)" }}>
            {t.menu.menuBeingPrepared}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--site-muted)" }}>
            {t.menu.checkBackSoon}
            {restaurant?.phone ? (
              <>
                {" "}
                {t.menu.or}{" "}
                <a href={`tel:${restaurant.phone}`} className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
                  {t.menu.giveUsACall}
                </a>
              </>
            ) : null}
            .
          </p>
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-16">
          {hasSpecials && (
            <div className="flex flex-col gap-8">
              <CategoryHeading id="specials" label={t.menu.todaysSpecials} />
              <SpecialImage
                src={specialsImageUrl!}
                alt={`${restaurant?.name ?? "Restaurant"} — ${t.menu.todaysSpecials}`}
                tapToEnlargeLabel={t.specialImage.tapToEnlarge}
              />
            </div>
          )}

          {presentCategories.map((category) => (
            <div key={category} className="flex flex-col gap-10">
              <CategoryHeading id={category.replace("_", "-")} label={categoryLabel[category]} />
              {byCategory.get(category)!.map((section, i) => (
                <MenuSection key={i} section={section} currency={currency} locale={locale} />
              ))}
            </div>
          ))}

          {(taxNote || disclaimer) && (
            <footer className="border-t pt-6 text-center text-xs" style={{ borderColor: "var(--site-border)", color: "var(--site-muted)" }}>
              {taxNote && <p>{taxNote}</p>}
              {disclaimer && <p>{disclaimer}</p>}
            </footer>
          )}
        </div>
      )}

      <div className="mt-14 flex flex-wrap items-center justify-center gap-3 text-center">
        {restaurant?.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--site-primary)" }}
          >
            {t.common.callToOrderWith(restaurant.phone)}
          </a>
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
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/catering" className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
          {t.menu.cateringCta}
        </Link>
      </p>
    </main>
  );
}
