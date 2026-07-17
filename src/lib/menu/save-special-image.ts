/**
 * "Save to camera roll" for the rendered Daily Special (2026-07-16, owner's
 * ask) — browser-only, used by the Review & Publish screen.
 *
 * ## Why this isn't just a download link
 *
 * The published artifact is an **SVG** (docs/08's "AI reads, app draws"), and
 * no phone photo library accepts SVG. So the menu is rasterized to PNG here,
 * client-side, and handed to the **Web Share API** — on iOS/Android that opens
 * the native share sheet, whose "Save Image" is the only route into the camera
 * roll from a web page. Desktop browsers without file-share support fall back
 * to an ordinary download.
 *
 * ## Why canvas rasterization is safe (and exact) here
 *
 * Two properties of the renderer make this WYSIWYG rather than a re-render
 * that might drift from what the owner approved:
 *  - the SVG is fully self-contained — shapes and `<text>` only, no external
 *    images and **no webfonts** (special-menu-themes.ts says so explicitly:
 *    only fonts already on the system resolve). That means the canvas is never
 *    tainted, so `toBlob` works, and the pixels match the on-screen preview.
 *  - the root `<svg>` carries explicit width/height, so `naturalWidth/Height`
 *    resolve in every browser (an SVG without them measures 0 in Safari and
 *    Firefox — the classic version of this bug).
 * The preview the owner is looking at is byte-identical to the published
 * artifact whenever the draft isn't dirty (CLAUDE.md), so rasterizing the
 * preview *is* rasterizing the published menu — no refetch needed.
 */

/** Rendered at 2× the SVG's 1000px width: a ~2000px PNG looks right in a photo library and stays a few hundred KB of flat color. */
const SCALE = 2;

export type SaveImageOutcome = "shared" | "downloaded" | "cancelled";

/** Rasterizes an `data:image/svg+xml,…` URL to a PNG blob. */
async function svgDataUrlToPngBlob(svgDataUrl: string): Promise<Blob> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("The menu image could not be read."));
    img.src = svgDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * SCALE);
  canvas.height = Math.round(img.naturalHeight * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The menu image could not be prepared.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The menu image could not be prepared.");
  return blob;
}

/** True when this browser can share image files — i.e. the camera-roll route exists (iOS/Android). Probe with a real File; `navigator.share` alone isn't enough, since some browsers share links but not files. */
export function canShareImageFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([new Blob()], "probe.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke on the next tick — revoking synchronously can cancel the download
  // in some browsers before it has actually started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterizes and offers the menu to the device: share sheet where available
 * (→ "Save Image" → camera roll), download otherwise.
 *
 * Returns "cancelled" when the share sheet is dismissed — that's a normal
 * thing for someone to do, NOT an error, and callers must not show a failure
 * message for it.
 *
 * Must be called directly from a click: `navigator.share` requires transient
 * user activation, which the rasterization above (a few hundred ms at most)
 * stays comfortably inside. If activation is lost anyway, or the share fails
 * for any non-cancel reason, this falls back to a download rather than
 * leaving the owner with nothing.
 */
export async function saveSpecialImage(svgDataUrl: string, filename: string): Promise<SaveImageOutcome> {
  const blob = await svgDataUrlToPngBlob(svgDataUrl);

  if (canShareImageFiles()) {
    const file = new File([blob], filename, { type: "image/png" });
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // NotAllowedError (lost activation), or a share target that failed —
      // the owner still wants their image.
      console.error("share failed, falling back to download:", err);
    }
  }

  download(blob, filename);
  return "downloaded";
}

/**
 * e.g. daily-special-2026-07-16.png, daily-special-2026-07-16-es.png — dated
 * so a camera roll full of these stays sortable, and language-suffixed so
 * saving both versions of the same day's board yields two distinct files
 * rather than one silently replacing the other.
 */
export function specialImageFilename(locale: "en" | "es" = "en", date = new Date()): string {
  const suffix = locale === "es" ? "-es" : "";
  return `daily-special-${date.toISOString().slice(0, 10)}${suffix}.png`;
}
