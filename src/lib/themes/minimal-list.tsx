import type { CSSProperties } from "react";
import type { MenuSnapshotPayload } from "@/types/database";
import { resolveDesignTokens, tokensToCssVariables } from "./tokens";
import { formatPrice, formatHours } from "./format";

/** "minimal-list" theme (docs/03 seed): generous whitespace, hairline dividers, light headings. */
export function MinimalListTheme({ payload }: { payload: MenuSnapshotPayload }) {
  const tokens = resolveDesignTokens(payload.restaurant.brand, payload.styleOverrides);
  const currency = payload.restaurant.menu_defaults.currency ?? "USD";
  const style = tokensToCssVariables(tokens) as CSSProperties;

  return (
    <div
      style={{ ...style, background: "var(--mma-color-background)", color: "var(--mma-color-text)", fontFamily: "var(--mma-font-body)" }}
      className="mx-auto max-w-lg px-8 py-14"
    >
      <header className="mb-12 text-center">
        <h1 style={{ fontFamily: "var(--mma-font-heading)" }} className="text-2xl font-light tracking-widest uppercase">
          {payload.restaurant.name}
        </h1>
        {payload.restaurant.address && <p className="mt-2 text-xs uppercase tracking-wide opacity-50">{payload.restaurant.address}</p>}
        {payload.restaurant.hours.length > 0 && (
          <p className="mt-1 text-xs uppercase tracking-wide opacity-40">{formatHours(payload.restaurant.hours).join(" · ")}</p>
        )}
      </header>

      <div className="flex flex-col gap-10">
        {payload.menu.sections.map((section, i) => (
          <section key={i}>
            <h2 className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] opacity-60">{section.name}</h2>
            <div className="flex flex-col">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-baseline justify-between gap-4 border-b border-neutral-100 py-2 last:border-0">
                  <div>
                    <span className="text-sm">{item.name}</span>
                    {item.description && <p className="text-xs opacity-50">{item.description}</p>}
                  </div>
                  <span style={{ color: "var(--mma-color-accent)" }} className="whitespace-nowrap text-sm">
                    {formatPrice(item.price_cents, item.price_note, currency)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {(payload.restaurant.menu_defaults.taxNote || payload.restaurant.menu_defaults.disclaimer) && (
        <footer className="mt-14 text-center text-xs opacity-40">
          {payload.restaurant.menu_defaults.taxNote && <p>{payload.restaurant.menu_defaults.taxNote}</p>}
          {payload.restaurant.menu_defaults.disclaimer && <p>{payload.restaurant.menu_defaults.disclaimer}</p>}
        </footer>
      )}
    </div>
  );
}
