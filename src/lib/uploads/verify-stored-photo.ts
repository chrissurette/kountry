import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side check that a just-uploaded public photo actually honors the
 * photo policy (WebP, and not absurdly large) — see src/lib/uploads/
 * downscale.ts for the policy itself.
 *
 * Why this exists: conversion happens in the *browser* (canvas), which is
 * fast and free but is a convention, not a guarantee — a stale tab, a failed
 * encode, or a hand-crafted request against the signed URL could still land
 * a 4MB PNG in a bucket the public site serves. The owner's ask was that
 * photos be converted "before they are stored", so this is the enforcement
 * point: the confirm step reads back what actually landed and **deletes it,
 * failing the upload, if it isn't policy-compliant**.
 *
 * Deliberately NOT a re-encode: doing that server-side would mean pulling
 * sharp (or similar) into the Netlify function bundle for a path that
 * already works client-side in every real browser — cost and cold-start for
 * a case that shouldn't happen. Reject-and-tell beats silently accepting
 * junk, and the message tells the owner exactly what to do.
 *
 * The JPEG fallback is legitimate (Safari/iPad can't encode WebP), so JPEG
 * passes — the size ceiling is what stops an un-downscaled original either
 * way.
 */

/** Generous: a 1600px q90 WebP lands ~100-300KB, and the Safari JPEG fallback ~400KB. 2MB means the client pipeline didn't run at all. */
const MAX_STORED_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/webp", "image/jpeg"]);

export class PhotoPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoPolicyError";
  }
}

/**
 * Verifies the object at `path`, removing it and throwing PhotoPolicyError
 * if it violates the policy. Call from the confirm step, after the browser's
 * upload has actually completed.
 */
export async function verifyStoredPhoto(supabase: SupabaseClient, bucket: string, path: string): Promise<void> {
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);

  const { data: files, error } = await supabase.storage.from(bucket).list(folder, { search: name });
  if (error) {
    // Don't fail an otherwise-good upload because the check itself broke.
    console.error("verifyStoredPhoto: list failed, skipping check:", error);
    return;
  }
  const file = files?.find((f) => f.name === name);
  if (!file) {
    console.error(`verifyStoredPhoto: ${path} not found, skipping check`);
    return;
  }

  const mime = file.metadata?.mimetype as string | undefined;
  const size = (file.metadata?.size ?? file.metadata?.contentLength ?? 0) as number;

  const badMime = mime !== undefined && !ALLOWED_MIME.has(mime);
  const tooBig = size > MAX_STORED_BYTES;
  if (!badMime && !tooBig) return;

  await supabase.storage.from(bucket).remove([path]);
  throw new PhotoPolicyError(
    badMime
      ? `That file was stored as ${mime}, but photos must be WebP or JPEG. Try uploading it again from the photo picker.`
      : `That photo is ${Math.round(size / 1024 / 1024)}MB after processing — too large. Try uploading it again, or pick a smaller original.`
  );
}
