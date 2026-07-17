/**
 * Browser-side JPEG composition of the rendered Daily Special for social
 * crossposting (docs/10). Runs at "Save & render" time, from the same SVG the
 * owner is previewing.
 *
 * ## Why the browser, and why JPEG
 *
 * Instagram's API accepts **JPEG only**, fetched from a **public URL**, at an
 * aspect ratio between **4:5 and 1.91:1**. Our artifact is an SVG whose height
 * follows the content — a full board is portrait past 4:5 — so it qualifies on
 * none of those counts and must be re-encoded and re-framed.
 *
 * That work happens here rather than server-side because the SVG deliberately
 * uses **system fonts** (special-menu-themes.ts) and Netlify functions have
 * none: a server render would post a menu that looks nothing like the one the
 * owner approved. The browser already has the exact fonts. This is the same
 * canvas path the camera-roll button proved (src/lib/menu/save-special-image.ts).
 *
 * Two images, because the two networks want different things:
 *   - Facebook: natural ratio, no reframing, nothing cropped.
 *   - Instagram: letterboxed onto a 4:5 canvas in the theme's own background
 *     colour, so a long board shrinks rather than getting cropped. Cropping a
 *     menu would silently amputate menu items — unacceptable; small-but-whole
 *     is the honest failure mode, and the caption carries the menu link.
 */

/** IG's own maximum useful width is 1440px; 1080x1350 is the canonical 4:5 feed size and keeps files well under the 8MB cap. */
const IG_WIDTH = 1080;
const IG_HEIGHT = 1350;
/** Facebook has no ratio limit; cap the long edge so a very tall board stays a sane file size. */
const FB_MAX_LONG_EDGE = 2200;
const JPEG_QUALITY = 0.9;

export interface ComposedSocialImages {
  facebook: Blob;
  instagram: Blob;
}

function loadSvg(svgDataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The menu image could not be read."));
    img.src = svgDataUrl;
  });
}

async function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("The menu image could not be prepared.");
  return blob;
}

/**
 * Composes both social JPEGs. Throws only if the SVG itself can't be read —
 * callers treat a failure as "no social images this render" and carry on,
 * since a crosspost is never worth failing a menu render over.
 */
export async function composeSocialImages(svgDataUrl: string, backgroundColor: string): Promise<ComposedSocialImages> {
  const img = await loadSvg(svgDataUrl);
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;

  // --- Facebook: natural ratio, scaled to a sane long edge ---
  const fbScale = Math.min(1, FB_MAX_LONG_EDGE / Math.max(naturalW, naturalH)) * 2;
  const fbCanvas = document.createElement("canvas");
  fbCanvas.width = Math.round(naturalW * fbScale);
  fbCanvas.height = Math.round(naturalH * fbScale);
  const fbCtx = fbCanvas.getContext("2d");
  if (!fbCtx) throw new Error("The menu image could not be prepared.");
  // JPEG has no alpha: without a fill, any transparency composites to BLACK.
  // The renderer paints its own background rect, so this is insurance, not
  // decoration — and it's free.
  fbCtx.fillStyle = backgroundColor;
  fbCtx.fillRect(0, 0, fbCanvas.width, fbCanvas.height);
  fbCtx.drawImage(img, 0, 0, fbCanvas.width, fbCanvas.height);

  // --- Instagram: contain-fit onto 4:5, letterboxed in the theme colour ---
  const igCanvas = document.createElement("canvas");
  igCanvas.width = IG_WIDTH;
  igCanvas.height = IG_HEIGHT;
  const igCtx = igCanvas.getContext("2d");
  if (!igCtx) throw new Error("The menu image could not be prepared.");
  igCtx.fillStyle = backgroundColor;
  igCtx.fillRect(0, 0, IG_WIDTH, IG_HEIGHT);

  // `contain`, never `cover`: cover would crop, and cropping a menu deletes
  // dishes. Centred both ways.
  const scale = Math.min(IG_WIDTH / naturalW, IG_HEIGHT / naturalH);
  const drawW = Math.round(naturalW * scale);
  const drawH = Math.round(naturalH * scale);
  igCtx.drawImage(img, Math.round((IG_WIDTH - drawW) / 2), Math.round((IG_HEIGHT - drawH) / 2), drawW, drawH);

  return { facebook: await toJpeg(fbCanvas), instagram: await toJpeg(igCanvas) };
}
