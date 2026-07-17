/**
 * Client-side downscale + re-encode before upload. Runs entirely in the
 * browser via canvas — no server round trip just to shrink an image.
 *
 * ## The photo policy (owner's call, 2026-07-16)
 *
 * Every photo that will be **shown on the public site** (hero, gallery, main
 * menu item shots) is converted to **WebP at q90 — "visually lossless"** —
 * and capped at 1600px. Use `PUBLIC_PHOTO` for those; don't hand-roll the
 * numbers at call sites, or the paths drift apart again.
 *
 * **Why not literally lossless**, since that's the natural reading of the
 * ask: measured on this restaurant's own gallery photos, `lossless: true`
 * came out **8.5–13.6× larger** than q80 with no visible difference — for
 * photographic content lossless is the wrong tool (it exists for screenshots
 * and line art), and it would have undone the 24MB→1.6MB gallery fix. q90 is
 * indistinguishable to the eye even zoomed, at ~35% over q80. See CLAUDE.md's
 * dated note for the full measurement table.
 *
 * ## The Safari catch (load-bearing)
 *
 * `canvas.toBlob` does NOT error on an unsupported encoder — it silently
 * hands back a **PNG** (or null). Safari, i.e. the iPads this admin targets,
 * cannot encode WebP. So the WebP path checks `blob.type` and falls back to
 * JPEG, and the returned File's `.type` is the only truth about what a caller
 * actually got. Never assume the requested format came back.
 *
 * The Daily Specials board photo deliberately does NOT use this policy — it's
 * private (never served to visitors), its only job is fidelity for the vision
 * model, and docs/08 records two painful pivots getting extraction accurate.
 * It keeps its own higher-resolution JPEG settings.
 */

/** The one encode policy for public-facing photos. */
export const PUBLIC_PHOTO = { maxDimension: 1600, quality: 0.9, format: "webp" } as const;

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.85;

export interface DownscaleOptions {
  maxDimension?: number;
  quality?: number;
  /** "jpeg" (default) or "webp" — webp falls back to jpeg where unsupported (see above). */
  format?: "jpeg" | "webp";
}

export interface DownscaleResult {
  file: File;
  /** What the encoder actually produced — "webp" unless it fell back. */
  ext: "webp" | "jpg";
}

export async function downscaleImage(file: File, options?: DownscaleOptions): Promise<File> {
  return (await downscaleImageWithFormat(file, options)).file;
}

/**
 * Same as downscaleImage but also reports the resulting extension, so callers
 * can tell the API what actually landed rather than guessing.
 */
export async function downscaleImageWithFormat(file: File, options?: DownscaleOptions): Promise<DownscaleResult> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const wantWebp = options?.format === "webp";

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, ext: file.type === "image/webp" ? "webp" : "jpg" };
  ctx.drawImage(bitmap, 0, 0, width, height);

  const encode = (type: string): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));

  if (wantWebp) {
    const webp = await encode("image/webp");
    if (webp && webp.type === "image/webp") {
      return { file: new File([webp], "photo.webp", { type: "image/webp" }), ext: "webp" };
    }
  }

  const jpeg = await encode("image/jpeg");
  if (!jpeg) return { file, ext: "jpg" };
  return { file: new File([jpeg], "photo.jpg", { type: "image/jpeg" }), ext: "jpg" };
}
