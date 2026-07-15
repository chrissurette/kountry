import type { ComponentType } from "react";
import type { MenuSnapshotPayload } from "@/types/database";
import { ClassicTheme } from "./classic";
import { ModernGridTheme } from "./modern-grid";
import { ChalkboardTheme } from "./chalkboard";
import { MinimalListTheme } from "./minimal-list";
import { ImageSpecialTheme } from "./image-special";

/**
 * Theme key -> React renderer. All four seeded catalog rows (docs/03) are
 * implemented as of Phase 2. Unknown/future keys fall back to classic rather
 * than erroring, so a stale theme_id never breaks a live menu.
 *
 * Exposed as a single stable <ThemeRenderer> component (rather than a
 * getThemeRenderer() lookup returned to the caller) so call sites never
 * assign a component reference to a variable during their own render —
 * the lookup lives inside this component's body instead.
 */
const THEME_COMPONENTS: Record<string, ComponentType<{ payload: MenuSnapshotPayload }>> = {
  classic: ClassicTheme,
  "modern-grid": ModernGridTheme,
  chalkboard: ChalkboardTheme,
  "minimal-list": MinimalListTheme,
};

export function ThemeRenderer({ themeKey, payload }: { themeKey: string; payload: MenuSnapshotPayload }) {
  // An AI-generated Daily Special image (docs/05) is already fully styled —
  // show it directly regardless of the chosen theme key, rather than
  // rendering an empty sections list through a text-oriented theme.
  if (payload.menu.imageUrl) {
    return <ImageSpecialTheme payload={payload} />;
  }
  const Component = THEME_COMPONENTS[themeKey] ?? ClassicTheme;
  return <Component payload={payload} />;
}
