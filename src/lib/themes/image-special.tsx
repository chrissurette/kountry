import type { CSSProperties } from "react";
import type { MenuSnapshotPayload } from "@/types/database";
import { resolveDesignTokens, tokensToCssVariables } from "./tokens";
import { formatHours } from "./format";

/**
 * Renders an AI-generated Daily Special image (docs/05's image pipeline) —
 * used by ThemeRenderer regardless of the menu's chosen theme key, since
 * the image is already fully styled and doesn't need per-theme section
 * rendering. Keeps the same header/footer chrome as the text-based themes
 * so History's live preview (src/app/admin/history/history-list.tsx) still
 * looks cohesive across old and new snapshots.
 */
export function ImageSpecialTheme({ payload }: { payload: MenuSnapshotPayload }) {
  const tokens = resolveDesignTokens(payload.restaurant.brand, payload.styleOverrides);
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
      <header className="mb-6 text-center">
        <h1
          style={{ fontFamily: "var(--mma-font-heading)", color: "var(--mma-color-primary)" }}
          className="text-3xl font-bold"
        >
          {payload.restaurant.name}
        </h1>
        {payload.restaurant.address && <p className="mt-1 text-sm opacity-70">{payload.restaurant.address}</p>}
        {payload.restaurant.phone && <p className="text-sm opacity-70">{payload.restaurant.phone}</p>}
        {payload.restaurant.hours.length > 0 && (
          <p className="mt-1 text-xs opacity-60">{formatHours(payload.restaurant.hours).join(" · ")}</p>
        )}
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
      <img
        src={payload.menu.imageUrl!}
        alt={`${payload.restaurant.name} — Today's Specials`}
        className="w-full rounded-lg shadow-sm"
      />

      {(payload.restaurant.menu_defaults.taxNote || payload.restaurant.menu_defaults.disclaimer) && (
        <footer className="mt-8 text-center text-xs opacity-60">
          {payload.restaurant.menu_defaults.taxNote && <p>{payload.restaurant.menu_defaults.taxNote}</p>}
          {payload.restaurant.menu_defaults.disclaimer && <p>{payload.restaurant.menu_defaults.disclaimer}</p>}
        </footer>
      )}
    </div>
  );
}
