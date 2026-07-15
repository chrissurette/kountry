"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { downscaleImage } from "@/lib/uploads/downscale";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

type Stage = "idle" | "downscaling" | "uploading" | "reading" | "error";

export function NewSpecialClient({
  existingDraft,
  locale,
}: {
  existingDraft: { id: string; hasImage: boolean } | null;
  locale: Locale;
}) {
  const router = useRouter();
  const t = getDictionary(locale).admin.capture;
  const STAGE_LABEL: Record<Stage, string> = {
    idle: "",
    downscaling: t.preparingPhoto,
    uploading: t.uploading,
    reading: t.readingMenu,
    error: "",
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(Boolean(existingDraft));

  function handleFileSelected(selected: File) {
    setError(null);
    setStage("idle");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function extract() {
    if (!file) return;
    setError(null);
    try {
      setStage("downscaling");
      // Higher ceiling than the default (docs/08) — this photo is what the
      // vision model reads the menu text from; more legible pixels help
      // extraction accuracy, and it's only read once.
      const downscaled = await downscaleImage(file, { maxDimension: 2200, quality: 0.92 });

      setStage("uploading");
      const targetRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "menu_photo", ext: "jpg" }),
      });
      if (!targetRes.ok) throw new Error(t.errorUploadPrep);
      const { assetId, path, token } = await targetRes.json();

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("assets").uploadToSignedUrl(path, token, downscaled);
      if (uploadError) throw uploadError;

      setStage("reading");
      const parseRes = await fetch("/api/menus/parse-special", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset_id: assetId }),
      });
      if (!parseRes.ok) {
        const b = await parseRes.json().catch(() => ({}));
        throw new Error(b.error ?? t.errorGeneric);
      }
      const { menuId } = await parseRes.json();
      router.push(`/admin/menus/${menuId}/review`);
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : t.errorGeneric);
    }
  }

  const busy = stage !== "idle" && stage !== "error";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10 text-center">
      {existingDraft && showResume && (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-left">
          <p className="text-sm font-medium text-amber-900">{t.resumeTitle}</p>
          <p className="text-sm text-amber-800">{existingDraft.hasImage ? t.resumeHasImage : t.resumeNoImage}</p>
          <div className="mt-1 flex items-center gap-3">
            <Link
              href={`/admin/menus/${existingDraft.id}/review`}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
            >
              {t.resume}
            </Link>
            <button
              type="button"
              onClick={() => setShowResume(false)}
              className="text-sm font-medium text-amber-800 hover:underline"
            >
              {t.startNew}
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFileSelected(selected);
          e.target.value = "";
        }}
      />

      {!file ? (
        <>
          <div>
            <h1 className="text-xl font-semibold">{t.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t.description}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
          >
            {t.takeOrChoosePhoto}
          </button>
        </>
      ) : (
        <div className="flex w-full flex-col gap-5 text-left">
          <div>
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not uploaded yet */}
              <img src={previewUrl!} alt="Selected specials board photo" className="w-full" />
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="mt-2 text-sm font-medium text-neutral-600 hover:underline disabled:opacity-50"
            >
              {t.choosePhotoDifferent}
            </button>
          </div>

          <button
            type="button"
            onClick={extract}
            disabled={busy}
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? STAGE_LABEL[stage] : t.readThisMenu}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
