import type { CSSProperties } from "react";
import type { MenuSnapshotPayload } from "@/types/database";
import { resolveDesignTokens, tokensToCssVariables } from "./tokens";
import { formatPrice, formatHours } from "./format";

/** "modern-grid" theme (docs/03 seed): two-column item grid, bold compact headings, no dividers. */
export function ModernGridTheme({ payload }: { payload: MenuSnapshotPayload }) {
  const tokens = resolveDesignTokens(payload.restaurant.brand, payload.styleOverrides);
  const currency = payload.restaurant.menu_defaults.currency ?? "USD";
  const style = tokensToCssVariables(tokens) as CSSProperties;

  return (
    <div
      style={{ ...style, background: "var(--mma-color-background)", color: "var(--mma-color-text)", fontFamily: "var(--mma-font-body)" }}
      className="mx-auto max-w-3xl px-6 py-10"
    >
      <header className="mb-8">
        <h1
          style={{ fontFamily: "var(--mma-font-heading)", color: "var(--mma-color-primary)" }}
          className="text-3xl font-extrabold uppercase tracking-tight"
        >
          {payload.restaurant.name}
        </h1>
        <div className="mt-1 flex flex-wrap gap-3 text-xs opacity-60">
          {payload.restaurant.address && <span>{payload.restaurant.address}</span>}
          {payload.restaurant.phone && <span>{payload.restaurant.phone}</span>}
          {payload.restaurant.hours.length > 0 && <span>{formatHours(payload.restaurant.hours).join(" · ")}</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
        {payload.menu.sections.map((section, i) => (
          <section key={i}>
            <h2
              style={{ fontFamily: "var(--mma-font-heading)", color: "var(--mma-color-primary)" }}
              className="mb-2 text-sm font-bold uppercase tracking-wider"
            >
              {section.name}
            </h2>
            <div className="flex flex-col gap-2">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold">{item.name}</span>
                    {item.description && <p className="text-xs opacity-60">{item.description}</p>}
                  </div>
                  <span style={{ color: "var(--mma-color-accent)" }} className="whitespace-nowrap text-sm font-bold">
                    {formatPrice(item.price_cents, item.price_note, currency)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {(payload.restaurant.menu_defaults.taxNote || payload.restaurant.menu_defaults.disclaimer) && (
        <footer className="mt-10 text-xs opacity-50">
          {payload.restaurant.menu_defaults.taxNote && <p>{payload.restaurant.menu_defaults.taxNote}</p>}
          {payload.restaurant.menu_defaults.disclaimer && <p>{payload.restaurant.menu_defaults.disclaimer}</p>}
        </footer>
      )}
    </div>
  );
}
