"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { downscaleImageWithFormat, PUBLIC_PHOTO } from "@/lib/uploads/downscale";

interface MediaItem {
  id: string;
  kind: "hero" | "gallery";
  url: string;
  caption: string | null;
}

/** Shared upload flow for both sections — same signed-upload-URL pattern as the menu capture screen. */
async function uploadFile(kind: "hero" | "gallery", file: File): Promise<void> {
  // PUBLIC_PHOTO = the one shared policy for anything shown to visitors:
  // WebP q90 ("visually lossless"), ≤1600px, JPEG fallback on Safari/iPad.
  // `ext` is what the encoder actually produced, never an assumption.
  const { file: downscaled, ext } = await downscaleImageWithFormat(file, PUBLIC_PHOTO);

  const targetRes = await fetch("/api/site-media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, ext }),
  });
  if (!targetRes.ok) throw new Error("Could not prepare the upload.");
  const { path, token } = await targetRes.json();

  const supabase = createClient();
  // cacheControl is seconds; one year + the CDN treating it as immutable is
  // correct here because paths are UUID-unique — replacing or re-uploading a
  // photo always mints a NEW path, so a cached URL can never go stale, and
  // the 2026-07-16 audit found the old uploads shipping `no-cache` (every
  // visitor re-downloaded every photo, every visit).
  const { error } = await supabase.storage
    .from("site-media")
    .uploadToSignedUrl(path, token, downscaled, { cacheControl: "31536000" });
  if (error) throw error;

  // The public site is ISR'd — revalidate now that the file has actually
  // landed in Storage (not right after POST /api/site-media, which only
  // issues the signed URL and would race this upload). This step also
  // server-verifies the stored file against the photo policy and 422s if it
  // doesn't comply, so surface that message rather than silently succeeding.
  const confirmRes = await fetch("/api/site-media/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!confirmRes.ok) {
    const data = await confirmRes.json().catch(() => null);
    throw new Error(data?.error ?? "The photo could not be saved.");
  }
}

export function SiteMediaManager({
  initialHero,
  initialGallery,
}: {
  initialHero: MediaItem[];
  initialGallery: MediaItem[];
}) {
  const router = useRouter();
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hero = initialHero[0];

  async function handleHeroFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      await uploadFile("hero", file);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGalleryFiles(files: FileList) {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        await uploadFile("gallery", file);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCaptionBlur(id: string, value: string) {
    const caption = value.trim() || null;
    try {
      const res = await fetch(`/api/site-media/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) throw new Error("Could not save caption.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Caption save failed.");
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete photo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-1 font-medium">Hero photo</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Shown on the homepage. Uploading a new one replaces the current photo.
        </p>

        {hero ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
            <img src={hero.url} alt="Homepage hero" className="aspect-video w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-400">
            No hero photo yet
          </div>
        )}

        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleHeroFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => heroInputRef.current?.click()}
          className="mt-3 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {hero ? "Replace hero photo" : "Upload hero photo"}
        </button>
      </section>

      <section>
        <h2 className="mb-1 font-medium">Gallery</h2>
        <p className="mb-3 text-sm text-neutral-500">Shown on the Gallery page. Add as many as you like.</p>

        {initialGallery.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {initialGallery.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset */}
                  <img src={item.url} alt={item.caption || "Gallery photo"} className="h-full w-full object-cover" />
                  {/* Always visible — hover-to-reveal is unreachable on the touch tablets this admin targets. */}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(item.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                <input
                  type="text"
                  defaultValue={item.caption ?? ""}
                  placeholder="Caption (optional)"
                  maxLength={200}
                  onBlur={(e) => handleCaptionBlur(item.id, e.target.value)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleGalleryFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => galleryInputRef.current?.click()}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Add photos
        </button>
      </section>
    </div>
  );
}
