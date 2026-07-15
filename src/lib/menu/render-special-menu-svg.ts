import type { DailySpecialMenu } from "./special-menu-schema";
import type { MenuTheme } from "./special-menu-themes";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Deterministic Daily Special renderer: structured menu + theme -> SVG string.
 * PURE — no OpenAI, no Supabase, no Node/browser APIs — so the exact same
 * function produces the client-side live preview (Review screen) and the
 * server-rendered artifact that gets published. All readable text is real
 * SVG <text>, giving crisp, exact names/prices instead of AI-painted pixels
 * (docs/08). Layout: full-width header, then a two-column band (entrees left,
 * feature/soup/combos/veggie/dessert boxes right), then a full-width sides
 * grid, then an optional footer note.
 *
 * `locale` (2026-07-15, docs/08's Spanish translation) selects the STRUCTURAL
 * labels below ("Soup of the Day", "Choose Your Sides", etc.) — these are box
 * titles/row labels the renderer draws itself, not part of `DailySpecialMenu`
 * (which only holds actual menu item names/prices). Caller's responsibility
 * to match locale to the data: render `special` (English) with "en", the
 * translated `specialEs` with "es" — never the admin UI's own display
 * language, which is unrelated to which language the rendered artifact is in.
 */

const LABELS: Record<
  Locale,
  {
    defaultTitle: string;
    featured: string;
    soupOfTheDay: string;
    combos: string;
    veggiePlate: string;
    price: string;
    desserts: string;
    chooseYourSides: string;
  }
> = {
  en: {
    defaultTitle: "Daily Specials",
    featured: "Featured",
    soupOfTheDay: "Soup of the Day",
    combos: "Combos",
    veggiePlate: "Veggie Plate",
    price: "Price",
    desserts: "Desserts",
    chooseYourSides: "Choose Your Sides",
  },
  es: {
    defaultTitle: "Especiales del Día",
    featured: "Destacado",
    soupOfTheDay: "Sopa del Día",
    combos: "Combos",
    veggiePlate: "Plato Vegetariano",
    price: "Precio",
    desserts: "Postres",
    chooseYourSides: "Elige tus Acompañamientos",
  },
};

const WIDTH = 1000;
const PAD = 44;
const CONTENT_W = WIDTH - PAD * 2;
const GUTTER = 36;
const LEFT_W = Math.round(CONTENT_W * 0.56);
const RIGHT_X = PAD + LEFT_W + GUTTER;
const RIGHT_W = WIDTH - PAD - RIGHT_X;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Approximate greedy word-wrap. Proportional fonts average ~0.52em/char. */
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** "$"-prefix numeric prices; pass through non-numeric ("MP", "12/18") as-is. */
function formatPrice(price: string | null): string {
  if (!price) return "";
  const trimmed = price.trim();
  if (!trimmed) return "";
  return /^[\d.]+$/.test(trimmed) ? `$${trimmed}` : trimmed;
}

interface Ctx {
  parts: string[];
  theme: MenuTheme;
}

function text(
  ctx: Ctx,
  content: string,
  x: number,
  y: number,
  opts: { size: number; font?: "heading" | "body"; weight?: number; fill?: string; anchor?: "start" | "middle" | "end"; italic?: boolean }
): void {
  const family = opts.font === "heading" ? ctx.theme.headingFont : ctx.theme.bodyFont;
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${esc(family)}"`,
    `font-size="${opts.size}"`,
    `fill="${opts.fill ?? ctx.theme.ink}"`,
    opts.weight ? `font-weight="${opts.weight}"` : "",
    opts.anchor ? `text-anchor="${opts.anchor}"` : "",
    opts.italic ? `font-style="italic"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  ctx.parts.push(`<text ${attrs}>${esc(content)}</text>`);
}

function line(ctx: Ctx, x1: number, y: number, x2: number, opts?: { color?: string; dashed?: boolean; width?: number }): void {
  ctx.parts.push(
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${opts?.color ?? ctx.theme.border}" stroke-width="${opts?.width ?? 1}"${
      opts?.dashed ? ' stroke-dasharray="2 4"' : ""
    } />`
  );
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.parts.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ctx.theme.surface}" stroke="${ctx.theme.border}" stroke-width="1" rx="6" />`
  );
}

// ---- Header ----------------------------------------------------------------

function renderHeader(ctx: Ctx, menu: DailySpecialMenu, top: number, labels: (typeof LABELS)[Locale]): number {
  let y = top;

  if (menu.restaurantName) {
    text(ctx, menu.restaurantName, PAD, y + 24, { size: 24, font: "heading", weight: 700, fill: ctx.theme.accent });
  }

  // Right-aligned standardized letterhead: address and phone (from the
  // restaurant profile — see parse-/render-special-service.ts), then the
  // board's own date at the BOTTOM (2026-07-15, owner's call). The date is
  // the ONE piece of the top-right area still read from the handwritten
  // photo; name/address/phone are standardized. Combines the greeting/label
  // ("Happy Monday") with the date itself ("7-13-26") into one line, and is
  // lightly emphasized as the one dynamic per-board value.
  const dateLine = [menu.dateLabel, menu.dateText].map((s) => s?.trim()).filter(Boolean).join(" ");
  const rightLines: Array<{ text: string; date?: boolean }> = [];
  if (menu.address) rightLines.push({ text: menu.address });
  if (menu.phone) rightLines.push({ text: menu.phone });
  if (dateLine) rightLines.push({ text: dateLine, date: true });

  let ry = y + 16;
  for (const rl of rightLines) {
    text(ctx, rl.text, WIDTH - PAD, ry, {
      size: rl.date ? 14 : 12,
      anchor: "end",
      weight: rl.date ? 600 : undefined,
      fill: rl.date ? ctx.theme.ink : ctx.theme.muted,
    });
    ry += rl.date ? 20 : 16;
  }

  y = Math.max(y + 40, ry) + 18;

  text(ctx, menu.title || labels.defaultTitle, WIDTH / 2, y + 36, { size: 46, font: "heading", weight: 700, anchor: "middle" });
  y += 52;

  if (menu.subtitle) {
    const lines = wrapText(menu.subtitle, 16, CONTENT_W - 120);
    lines.forEach((l) => {
      text(ctx, l, WIDTH / 2, y + 14, { size: 16, anchor: "middle", italic: true, fill: ctx.theme.muted });
      y += 21;
    });
  }

  y += 14;
  line(ctx, PAD, y, WIDTH - PAD, { color: ctx.theme.accent, width: 2 });
  return y + 24;
}

// ---- Left column: entrees --------------------------------------------------

function renderEntrees(ctx: Ctx, menu: DailySpecialMenu, top: number): number {
  let y = top;
  const rightEdge = PAD + LEFT_W;

  for (const entree of menu.entrees) {
    const price = formatPrice(entree.price);
    // Wrap the name within the space the price doesn't occupy, so a long
    // item name never collides with its right-aligned price.
    const reserve = price ? Math.ceil(price.length * 19 * 0.62) + 14 : 0;
    const nameLines = wrapText(entree.name, 19, LEFT_W - reserve);
    nameLines.forEach((t, i) => {
      text(ctx, t, PAD, y + 17, { size: 19, weight: 600 });
      if (i === 0 && price) text(ctx, price, rightEdge, y + 17, { size: 19, weight: 600, anchor: "end", fill: ctx.theme.accent });
      y += 26;
    });

    if (entree.description) {
      for (const l of wrapText(entree.description, 13, LEFT_W)) {
        text(ctx, l, PAD, y + 12, { size: 13, italic: true, fill: ctx.theme.muted });
        y += 16;
      }
    }
    y += 6;
    line(ctx, PAD, y, rightEdge, { dashed: true });
    y += 12;
  }
  return y;
}

// ---- Right column: boxes ---------------------------------------------------

/** A titled box on the right column; returns the y just below it. */
function renderBox(ctx: Ctx, top: number, title: string, bodyLines: Array<{ left: string; right?: string; muted?: boolean; size?: number }>): number {
  const innerPad = 14;
  const titleH = 28;
  const lineH = 22;

  // Pre-wrap each row's left text within the width the price DOESN'T occupy,
  // so a long name (e.g. a dessert or combo) never overlaps its right-aligned
  // price. The price stays on the row's first wrapped line.
  const rlines: Array<{ text: string; size: number; muted?: boolean; right?: string }> = [];
  for (const bl of bodyLines) {
    const size = bl.size ?? 15;
    const reserve = bl.right ? Math.ceil(bl.right.length * size * 0.62) + 12 : 0;
    const avail = RIGHT_W - innerPad * 2 - reserve;
    const wrapped = wrapText(bl.left, size, avail);
    wrapped.forEach((t, i) => rlines.push({ text: t, size, muted: bl.muted, right: i === 0 ? bl.right : undefined }));
  }

  const boxH = innerPad + titleH + rlines.length * lineH + innerPad - 8;
  rect(ctx, RIGHT_X, top, RIGHT_W, boxH);

  let y = top + innerPad;
  text(ctx, title, RIGHT_X + innerPad, y + 15, { size: 15, font: "heading", weight: 700, fill: ctx.theme.accent });
  y += titleH;

  for (const rl of rlines) {
    text(ctx, rl.text, RIGHT_X + innerPad, y + 13, { size: rl.size, fill: rl.muted ? ctx.theme.muted : ctx.theme.ink });
    if (rl.right) text(ctx, rl.right, RIGHT_X + RIGHT_W - innerPad, y + 13, { size: rl.size, anchor: "end", fill: ctx.theme.accent });
    y += lineH;
  }
  return top + boxH + 16;
}

function renderRightColumn(ctx: Ctx, menu: DailySpecialMenu, top: number, labels: (typeof LABELS)[Locale]): number {
  let y = top;

  // Featured items (a list now) — all in one "Featured" box, one row each.
  const featured = menu.featured.filter((f) => f.name || f.description || f.price);
  if (featured.length) {
    const lines: Array<{ left: string; right?: string; muted?: boolean }> = [];
    for (const f of featured) {
      if (f.name) lines.push({ left: f.name, right: formatPrice(f.price) || undefined });
      else if (f.price) lines.push({ left: formatPrice(f.price) });
      if (f.description) {
        for (const l of wrapText(f.description, 13, RIGHT_W - 28)) lines.push({ left: l, muted: true });
      }
    }
    y = renderBox(ctx, y, labels.featured, lines);
  }

  // Soups (a list now) — one box; each soup is a name row followed by its
  // labeled price tiers (Cup/Bowl, Small/Large, or a single unlabeled price).
  const soups = menu.soups.filter((s) => s.name || s.tiers.some((t) => t.price));
  if (soups.length) {
    const lines: Array<{ left: string; right?: string; muted?: boolean }> = [];
    for (const s of soups) {
      if (s.name) lines.push({ left: s.name });
      for (const t of s.tiers) {
        const price = formatPrice(t.price);
        if (price) lines.push({ left: t.label ?? "", right: price });
      }
    }
    y = renderBox(ctx, y, labels.soupOfTheDay, lines);
  }

  if (menu.combos.length) {
    y = renderBox(
      ctx,
      y,
      labels.combos,
      menu.combos.map((c) => ({ left: c.name, right: formatPrice(c.price) || undefined }))
    );
  }

  if (menu.veggiePlate && (menu.veggiePlate.description || menu.veggiePlate.price)) {
    const lines: Array<{ left: string; right?: string; muted?: boolean }> = [];
    if (menu.veggiePlate.description) {
      for (const l of wrapText(menu.veggiePlate.description, 13, RIGHT_W - 28)) lines.push({ left: l, muted: true });
    }
    if (menu.veggiePlate.price) lines.push({ left: labels.price, right: formatPrice(menu.veggiePlate.price) });
    y = renderBox(ctx, y, labels.veggiePlate, lines);
  }

  if (menu.desserts.length) {
    // The board's own section header ("Slice of Cake") wins over the generic
    // localized "Desserts"/"Postres" — wording fidelity to the handwritten
    // board is the product promise (docs/08).
    y = renderBox(
      ctx,
      y,
      menu.dessertsLabel || labels.desserts,
      menu.desserts.map((d) => ({ left: d.name, right: formatPrice(d.price) || undefined }))
    );
  }

  return y;
}

// ---- Full-width sides grid -------------------------------------------------

function renderSides(ctx: Ctx, menu: DailySpecialMenu, top: number, labels: (typeof LABELS)[Locale]): number {
  if (!menu.sides.length) return top;
  let y = top;

  text(ctx, labels.chooseYourSides, WIDTH / 2, y + 18, { size: 20, font: "heading", weight: 700, anchor: "middle", fill: ctx.theme.accent });
  y += 38;

  const cols = 3;
  const colW = CONTENT_W / cols;
  const rows = Math.ceil(menu.sides.length / cols);
  for (let i = 0; i < menu.sides.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * colW;
    const ry = y + row * 24 + 13;
    text(ctx, `• ${menu.sides[i]}`, x, ry, { size: 15, fill: ctx.theme.ink });
  }
  return y + rows * 24 + 8;
}

// ---- Full-width additional (catch-all) sections ----------------------------
// Anything that didn't fit the fixed categories (docs/08 robustness pass):
// Breakfast, Appetizers, Kids Menu, etc. Rendered full-width below the sides,
// each with the board's own heading + optional note, then priced item rows —
// so a novel section is drawn faithfully instead of dropped.

function renderAdditionalSections(ctx: Ctx, menu: DailySpecialMenu, top: number): number {
  const sections = menu.additionalSections.filter((s) => s.title.trim() || s.items.length);
  if (!sections.length) return top;
  let y = top;

  for (const section of sections) {
    if (section.title.trim()) {
      text(ctx, section.title, WIDTH / 2, y + 18, { size: 20, font: "heading", weight: 700, anchor: "middle", fill: ctx.theme.accent });
      y += 30;
    }
    if (section.note) {
      for (const l of wrapText(section.note, 14, CONTENT_W - 120)) {
        text(ctx, l, WIDTH / 2, y + 12, { size: 14, anchor: "middle", italic: true, fill: ctx.theme.muted });
        y += 19;
      }
      y += 4;
    }

    for (const item of section.items) {
      const price = formatPrice(item.price);
      const reserve = price ? Math.ceil(price.length * 16 * 0.62) + 14 : 0;
      const nameLines = wrapText(item.name, 16, CONTENT_W - reserve);
      nameLines.forEach((t, i) => {
        text(ctx, t, PAD, y + 15, { size: 16, weight: 600 });
        if (i === 0 && price) text(ctx, price, WIDTH - PAD, y + 15, { size: 16, weight: 600, anchor: "end", fill: ctx.theme.accent });
        y += 22;
      });
      if (item.description) {
        for (const l of wrapText(item.description, 12, CONTENT_W)) {
          text(ctx, l, PAD, y + 11, { size: 12, italic: true, fill: ctx.theme.muted });
          y += 15;
        }
      }
      y += 5;
    }
    y += 16;
  }
  return y;
}

// ---- Decorative motifs -----------------------------------------------------
// Drawn faintly BEHIND the text (inserted between the background and the
// content layer) so a theme reads as tropical/summer/beach/winter without
// ever reducing the legibility of names and prices.

const n = (v: number) => v.toFixed(1);

/** A stylized leaf pointing along +x from (x,y), rotated `angle` degrees. */
function leaf(x: number, y: number, len: number, width: number, angle: number, color: string, opacity: number): string {
  const d = `M0 0 Q ${len * 0.5} ${-width} ${len} 0 Q ${len * 0.5} ${width} 0 0 Z`;
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${angle})">` +
    `<path d="${d}" fill="${color}" fill-opacity="${opacity}" />` +
    `<line x1="0" y1="0" x2="${len}" y2="0" stroke="${color}" stroke-opacity="${opacity + 0.14}" stroke-width="1.2" />` +
    `</g>`
  );
}

function sun(cx: number, cy: number, r: number, color: string, opacity: number): string {
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    rays +=
      `<line x1="${n(cx + Math.cos(a) * (r + 7))}" y1="${n(cy + Math.sin(a) * (r + 7))}" ` +
      `x2="${n(cx + Math.cos(a) * (r + 20))}" y2="${n(cy + Math.sin(a) * (r + 20))}" ` +
      `stroke="${color}" stroke-opacity="${opacity}" stroke-width="3" stroke-linecap="round" />`;
  }
  return `<g><circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="${color}" fill-opacity="${opacity}" />${rays}</g>`;
}

function waveStrip(y: number, color: string, opacity: number): string {
  const seg = 46;
  let d = `M0 ${y}`;
  let up = true;
  for (let x = 0; x < WIDTH; x += seg) {
    d += ` q ${seg / 2} ${up ? -11 : 11} ${seg} 0`;
    up = !up;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.5" stroke-linecap="round" />`;
}

function snowflake(cx: number, cy: number, r: number, color: string, opacity: number): string {
  let arms = "";
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 * Math.PI) / 180;
    arms += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx + Math.cos(a) * r)}" y2="${n(cy + Math.sin(a) * r)}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.6" stroke-linecap="round" />`;
    const bx = cx + Math.cos(a) * r * 0.6;
    const by = cy + Math.sin(a) * r * 0.6;
    for (const s of [-1, 1]) {
      const ba = a + (s * 42 * Math.PI) / 180;
      arms += `<line x1="${n(bx)}" y1="${n(by)}" x2="${n(bx + Math.cos(ba) * r * 0.32)}" y2="${n(by + Math.sin(ba) * r * 0.32)}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.1" stroke-linecap="round" />`;
    }
  }
  return `<g>${arms}</g>`;
}

function buildDecor(theme: MenuTheme, height: number): string[] {
  if (!theme.decor) return [];
  const c = theme.decorColor ?? theme.accent;
  const op = 0.15;
  const parts: string[] = [];

  switch (theme.decor) {
    case "palm":
      // fronds fanning inward from the top corners, plus a small pair at the bottom
      parts.push(leaf(-8, 26, 155, 26, 22, c, op), leaf(-8, 26, 122, 20, 52, c, op), leaf(-8, 26, 96, 15, 84, c, op));
      parts.push(leaf(WIDTH + 8, 26, 155, 26, 158, c, op), leaf(WIDTH + 8, 26, 122, 20, 128, c, op), leaf(WIDTH + 8, 26, 96, 15, 96, c, op));
      parts.push(leaf(-8, height - 18, 110, 20, -30, c, op), leaf(WIDTH + 8, height - 18, 110, 20, 210, c, op));
      break;
    case "sun":
      parts.push(sun(WIDTH - 74, 70, 36, c, op), sun(66, height - 62, 24, c, op * 0.85));
      break;
    case "waves":
      parts.push(waveStrip(24, c, op + 0.05), waveStrip(height - 24, c, op + 0.05), sun(WIDTH - 78, 66, 26, c, op));
      break;
    case "snow": {
      const spots: [number, number, number][] = [
        [64, 62, 16], [126, 128, 10], [42, 190, 8],
        [WIDTH - 62, 72, 16], [WIDTH - 132, 146, 10], [WIDTH - 42, 206, 8],
        [82, height - 72, 12], [WIDTH - 82, height - 92, 12],
      ];
      for (const [x, y, r] of spots) parts.push(snowflake(x, y, r, c, op + 0.07));
      break;
    }
  }
  return parts;
}

// ---- Assembly --------------------------------------------------------------

export function renderSpecialMenuSvg(menu: DailySpecialMenu, theme: MenuTheme, locale: Locale = "en"): string {
  const ctx: Ctx = { parts: [], theme };
  const labels = LABELS[locale];

  const bandTop = renderHeader(ctx, menu, PAD, labels);

  const leftBottom = renderEntrees(ctx, menu, bandTop);
  const rightBottom = renderRightColumn(ctx, menu, bandTop, labels);
  const bandBottom = Math.max(leftBottom, rightBottom);

  let y = bandBottom;
  if (menu.sides.length) {
    y += 8;
    line(ctx, PAD, y, WIDTH - PAD, { color: ctx.theme.border });
    y += 20;
    y = renderSides(ctx, menu, y, labels);
  }

  if (menu.additionalSections.some((s) => s.title.trim() || s.items.length)) {
    y += 12;
    line(ctx, PAD, y, WIDTH - PAD, { color: ctx.theme.border });
    y += 22;
    y = renderAdditionalSections(ctx, menu, y);
  }

  const height = Math.max(Math.round(y + PAD), 400);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${esc(
      menu.title || labels.defaultTitle
    )}">`,
    `<rect x="0" y="0" width="${WIDTH}" height="${height}" fill="${theme.background}" />`,
    ...buildDecor(theme, height),
    ...ctx.parts,
    `</svg>`,
  ].join("");
}
