import type { CSSProperties } from "react";
import type { MenuSnapshotPayload } from "@/types/database";
import { resolveDesignTokens, tokensToCssVariables } from "./tokens";
import { formatPrice, formatHours } from "./format";

/**
 * "chalkboard" theme (docs/03 seed): a fixed dark backdrop with light,
 * hand-lettered-style headings — the one theme whose base palette is
 * intentionally NOT the brand background/text colors (a chalkboard reads as
 * a chalkboard regardless of brand light/dark scheme). Brand fonts and
 * accent color still come through, same as every other theme.
 */
export function ChalkboardTheme({ payload }: { payload: MenuSnapshotPayload }) {
  const tokens = resolveDesignTokens(payload.restaurant.brand, payload.styleOverrides);
  const currency = payload.restaurant.menu_defaults.currency ?? "USD";
  const style = tokensToCssVariables(tokens) as CSSProperties;

  return (
    <div
      style={{ ...style, background: "#1f2a24", color: "#f4f1ea", fontFamily: "var(--mma-font-body)" }}
      className="mx-auto max-w-xl px-6 py-10"
    >
      <header className="mb-8 text-center">
        <h1 style={{ fontFamily: "var(--mma-font-heading)" }} className="text-4xl font-bold tracking-wide">
          {payload.restaurant.name}
        </h1>
        {payload.restaurant.address && <p className="mt-1 text-sm opacity-70">{payload.restaurant.address}</p>}
        {payload.restaurant.hours.length > 0 && (
          <p className="mt-1 text-xs opacity-60">{formatHours(payload.restaurant.hours).join(" · ")}</p>
        )}
      </header>

      <div className="flex flex-col gap-8">
        {payload.menu.sections.map((section, i) => (
          <section key={i}>
            <h2
              style={{ fontFamily: "var(--mma-font-heading)" }}
              className="mb-3 border-b border-dotted border-white/30 pb-1 text-center text-xl tracking-wide"
            >
              {section.name}
            </h2>
            <div className="flex flex-col gap-3">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-baseline justify-between gap-4">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.description && <p className="text-sm opacity-60">{item.description}</p>}
                  </div>
                  <span style={{ color: "var(--mma-color-accent)" }} className="whitespace-nowrap font-medium">
                    {formatPrice(item.price_cents, item.price_note, currency)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {(payload.restaurant.menu_defaults.taxNote || payload.restaurant.menu_defaults.disclaimer) && (
        <footer className="mt-10 text-center text-xs opacity-50">
          {payload.restaurant.menu_defaults.taxNote && <p>{payload.restaurant.menu_defaults.taxNote}</p>}
          {payload.restaurant.menu_defaults.disclaimer && <p>{payload.restaurant.menu_defaults.disclaimer}</p>}
        </footer>
      )}
    </div>
  );
}
