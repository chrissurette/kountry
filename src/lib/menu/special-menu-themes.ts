/**
 * Deterministic code themes for the Daily Special SVG renderer (2026-07-16
 * refactor). These REPLACE the old prompt-fragment "styles" (image-styles.ts)
 * for the primary path: a theme now controls real SVG colors, fonts, and
 * borders rather than describing a look to an image model.
 *
 * Font families are plain system stacks on purpose. The rendered SVG is
 * displayed via `<img src=...svg>`, which renders in an isolated context that
 * cannot load webfonts — only fonts already on the viewer's system resolve.
 * Generic serif/sans stacks are the reliable, crisp choice there.
 */
export interface MenuTheme {
  id: string;
  name: string;
  background: string;
  surface: string; // box fills on top of the background
  ink: string;
  muted: string;
  border: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  /** Optional decorative motif drawn (faintly, behind the text) by the renderer for a cohesive seasonal look. */
  decor?: "palm" | "sun" | "waves" | "snow";
  /** Color for the decorative motif; falls back to `accent`. */
  decorColor?: string;
}

export const MENU_THEMES: MenuTheme[] = [
  {
    id: "classic-cream",
    name: "Classic Cream",
    background: "#fbf7ef",
    surface: "#ffffff",
    ink: "#2b2620",
    muted: "#6f675b",
    border: "#d8cdb8",
    accent: "#7c2d12",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    id: "clean-white",
    name: "Clean White",
    background: "#ffffff",
    surface: "#f7f7f5",
    ink: "#1a1a1a",
    muted: "#6b7280",
    border: "#e3e3e0",
    accent: "#111827",
    headingFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  {
    id: "chalkboard",
    name: "Chalkboard",
    background: "#20241f",
    surface: "#2a2f28",
    ink: "#f2efe6",
    muted: "#b7b3a6",
    border: "#4b524a",
    accent: "#e6c079",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    id: "warm-diner",
    name: "Warm Diner",
    background: "#fdf6ec",
    surface: "#ffffff",
    ink: "#3a2a20",
    muted: "#8a6d5a",
    border: "#e6d3bf",
    accent: "#b5341f",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    id: "fresh-herb",
    name: "Fresh Herb",
    background: "#f2f6ee",
    surface: "#ffffff",
    ink: "#26301f",
    muted: "#5f6b52",
    border: "#d3ddc6",
    accent: "#3f6b32",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    id: "slate",
    name: "Slate",
    background: "#f4f6f8",
    surface: "#ffffff",
    ink: "#1f2933",
    muted: "#556472",
    border: "#d7dee5",
    accent: "#2b5c8a",
    headingFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  {
    id: "kraft-paper",
    name: "Kraft Paper",
    background: "#ece0cb",
    surface: "#f7efe0",
    ink: "#3b2f22",
    muted: "#786751",
    border: "#cdbfa4",
    accent: "#8a5a2b",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    id: "midnight",
    name: "Midnight",
    background: "#161b2e",
    surface: "#202741",
    ink: "#eef1f8",
    muted: "#9aa3bf",
    border: "#39415f",
    accent: "#e0b54a",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
  },
  {
    id: "tropical",
    name: "Tropical",
    background: "#f1faf5",
    surface: "#ffffff",
    ink: "#16302a",
    muted: "#5c7a72",
    border: "#cde7dd",
    accent: "#e2604a",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
    decor: "palm",
    decorColor: "#2f8f6d",
  },
  {
    id: "beach",
    name: "Beach",
    background: "#fbf6ea",
    surface: "#ffffff",
    ink: "#2f3f3d",
    muted: "#7c8985",
    border: "#e7dcc4",
    accent: "#1f97ab",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
    decor: "waves",
    decorColor: "#5bbccb",
  },
  {
    id: "summer",
    name: "Summer",
    background: "#fff7e9",
    surface: "#ffffff",
    ink: "#3a2f1e",
    muted: "#8a7a5f",
    border: "#f2e4c6",
    accent: "#ef7d17",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
    decor: "sun",
    decorColor: "#f4b23e",
  },
  {
    id: "winter",
    name: "Winter",
    background: "#f1f6fc",
    surface: "#ffffff",
    ink: "#1f2b3a",
    muted: "#5f6f82",
    border: "#d6e1ef",
    accent: "#3d6ea5",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "Helvetica, Arial, sans-serif",
    decor: "snow",
    decorColor: "#8fb4dd",
  },
];

export const DEFAULT_MENU_THEME_ID = MENU_THEMES[0].id;

export function getMenuTheme(id: string | null | undefined): MenuTheme {
  return MENU_THEMES.find((t) => t.id === id) ?? MENU_THEMES[0];
}
