import type { CSSProperties } from "react";
import type { MenuSnapshotPayload } from "@/types/database";
import { resolveDesignTokens, tokensToCssVariables } from "./tokens";
import { formatPrice, formatHours } from "./format";

/**
 * The "classic" theme (docs/03 seed) — single-column, comfortable spacing.
 * Phase 1 ships with only this one theme; docs/07 Phase 2 adds the rest
 * behind the same MenuSnapshotPayload contract, so this component's props
 * shape is the one every future theme also implements.
 */
export function ClassicTheme({ payload }: { payload: MenuSnapshotPayload }) {
  const tokens = resolveDesignTokens(payload.restaurant.brand, payload.styleOverrides);
  const currency = payload.restaurant.menu_defaults.currency ?? "USD";
  const style = tokensToCssVariables(tokens) as CSSProperties;

  return (
    <div
      style={{
        ...style,
        background: "var(--mma-color-background)",
        color: "var(--mma-color-text)",
        fontFamily: "var(--mma-font-body)",
      }}
      className="mx-auto max-w-xl px-6 py-10"
    >
      <header className="mb-8 text-center">
        <h1 style={{ fontFamily: "var(--mma-font-heading)", color: "var(--mma-color-primary)" }} className="text-3xl font-bold">
          {payload.restaurant.name}
        </h1>
        {payload.restaurant.address && <p className="mt-1 text-sm opacity-70">{payload.restaurant.address}</p>}
        {payload.restaurant.phone && <p className="text-sm opacity-70">{payload.restaurant.phone}</p>}
        {payload.restaurant.hours.length > 0 && (
          <p className="mt-1 text-xs opacity-60">{formatHours(payload.restaurant.hours).join(" · ")}</p>
        )}
      </header>

      {payload.menu.title && (
        <p style={{ color: "var(--mma-color-accent)" }} className="mb-6 text-center text-sm font-semibold uppercase tracking-wide">
          {payload.menu.title}
        </p>
      )}

      <div className="flex flex-col gap-8">
        {payload.menu.sections.map((section, i) => (
          <section key={i}>
            <h2
              style={{ fontFamily: "var(--mma-font-heading)", color: "var(--mma-color-primary)" }}
              className="mb-3 border-b pb-1 text-xl font-semibold"
            >
              {section.name}
            </h2>
            <div className="flex flex-col gap-3">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-baseline justify-between gap-4">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.description && <p className="text-sm opacity-70">{item.description}</p>}
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
        <footer className="mt-10 text-center text-xs opacity-60">
          {payload.restaurant.menu_defaults.taxNote && <p>{payload.restaurant.menu_defaults.taxNote}</p>}
          {payload.restaurant.menu_defaults.disclaimer && <p>{payload.restaurant.menu_defaults.disclaimer}</p>}
        </footer>
      )}
    </div>
  );
}
