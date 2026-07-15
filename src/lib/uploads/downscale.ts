/**
 * Client-side downscale + JPEG re-encode before upload (docs/06: halves
 * vision-API cost, keeps camera photos well under serverless body limits).
 * Runs entirely in the browser via canvas — no server round trip needed
 * just to shrink an image.
 *
 * Defaults (1600px/0.85) suit ordinary display photos (hero, gallery, menu
 * item shots). The Daily Specials capture flow passes a higher ceiling
 * (docs/08's text-garbling risk) since that source photo is the only detail
 * the image-gen model has to work from when reproducing a dense handwritten
 * board — more pixels in, at minimum, doesn't hurt fidelity, even though
 * text-volume garbling isn't purely a resolution problem.
 */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export async function downscaleImage(file: File, options?: { maxDimension?: number; quality?: number }): Promise<File> {
  const maxDimension = options?.maxDimension ?? MAX_DIMENSION;
  const quality = options?.quality ?? JPEG_QUALITY;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;

  return new File([blob], "menu.jpg", { type: "image/jpeg" });
}
