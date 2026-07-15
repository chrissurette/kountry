"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { renderSpecialMenuSvg } from "@/lib/menu/render-special-menu-svg";
import { MENU_THEMES, getMenuTheme } from "@/lib/menu/special-menu-themes";
import { hasMeaningfulContent, type DailySpecialMenu } from "@/lib/menu/special-menu-schema";
import type { PublishSchedule } from "@/types/database";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";

function field() {
  return "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
}

// Fixed-width price input for the flex rows (name · price · ✕). Deliberately
// omits `w-full` — pairing field()'s w-full with w-24 makes the two width
// utilities conflict, letting the price box demand 100% and starve the
// flex-1 name field beside it.
function priceField() {
  return "w-20 shrink-0 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none sm:w-24";
}

/** Spanish field — amber-tinted, matching the Main Menu editor's convention so a Spanish input is never mistaken for the English one next to it. */
function esField() {
  return "w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none";
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * A collapsible editor section. Collapsed by default so the review screen
 * stays short — the rendered preview + publish actions sit above these, and
 * the owner expands only the section they need to correct. `summary` shows a
 * one-line hint of the collapsed content (e.g. "11 items"); `attention` flags
 * a section that has something worth checking (drawn in amber with a dot).
 */
function Accordion({
  title,
  summary,
  attention = false,
  children,
}: {
  title: string;
  summary?: string;
  attention?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`overflow-hidden rounded-lg border ${attention && !open ? "border-amber-300" : "border-neutral-200"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {attention && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />}
          <span className="text-sm font-semibold">{title}</span>
          {summary && <span className={`truncate text-xs ${attention ? "text-amber-700" : "text-neutral-400"}`}>{summary}</span>}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-neutral-200 px-4 py-4">{children}</div>}
    </section>
  );
}

export function ReviewSpecialClient({
  menuId,
  initialSpecial,
  initialThemeId,
  initialImageUrl,
  initialSpecialEs,
  initialImageUrlEs,
  pendingSchedule,
  locale,
}: {
  menuId: string;
  initialSpecial: DailySpecialMenu | null;
  initialThemeId: string;
  initialImageUrl: string | null;
  initialSpecialEs: DailySpecialMenu | null;
  initialImageUrlEs: string | null;
  pendingSchedule: PublishSchedule | null;
  locale: Locale;
}) {
  const t = getDictionary(locale).admin.review;
  const [special, setSpecial] = useState<DailySpecialMenu | null>(initialSpecial);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(initialImageUrl);
  const [dirty, setDirty] = useState(initialSpecial != null && initialImageUrl == null);
  const [rendering, setRendering] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [schedule, setSchedule] = useState(pendingSchedule);
  const [status, setStatus] = useState<"idle" | "busy" | "published" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Spanish translation (docs/08): a full parallel DailySpecialMenu, rendered
  // with the same theme as a second image. Null until the owner translates.
  const [specialEs, setSpecialEs] = useState<DailySpecialMenu | null>(initialSpecialEs);
  const [renderedUrlEs, setRenderedUrlEs] = useState<string | null>(initialImageUrlEs);
  const [showSpanish, setShowSpanish] = useState(false);
  const [translating, setTranslating] = useState(false);

  const previewDataUrl = useMemo(() => {
    if (!special) return null;
    const svg = renderSpecialMenuSvg(special, getMenuTheme(themeId), "en");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [special, themeId]);

  const previewDataUrlEs = useMemo(() => {
    if (!specialEs) return null;
    const svg = renderSpecialMenuSvg(specialEs, getMenuTheme(themeId), "es");
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [specialEs, themeId]);

  function edit(mutator: (draft: DailySpecialMenu) => void) {
    setSpecial((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
    setDirty(true);
  }

  function editEs(mutator: (draft: DailySpecialMenu) => void) {
    setSpecialEs((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
    setDirty(true);
  }

  // Array add/remove touch both languages together (when a translation
  // exists) so entrees[i]/combos[i]/desserts[i]/sides[i] stay aligned by
  // index between English and Spanish — editEs() alone can't add a row, only
  // edit an existing one.
  function addEntree() {
    edit((d) => d.entrees.push({ name: "", description: null, price: null, confidence: 1 }));
    if (specialEs) editEs((d) => d.entrees.push({ name: "", description: null, price: null, confidence: 1 }));
  }
  function removeEntree(i: number) {
    edit((d) => d.entrees.splice(i, 1));
    if (specialEs) editEs((d) => d.entrees.splice(i, 1));
  }
  function addCombo() {
    edit((d) => d.combos.push({ name: "", price: null }));
    if (specialEs) editEs((d) => d.combos.push({ name: "", price: null }));
  }
  function removeCombo(i: number) {
    edit((d) => d.combos.splice(i, 1));
    if (specialEs) editEs((d) => d.combos.splice(i, 1));
  }
  function addDessert() {
    edit((d) => d.desserts.push({ name: "", price: null }));
    if (specialEs) editEs((d) => d.desserts.push({ name: "", price: null }));
  }
  function removeDessert(i: number) {
    edit((d) => d.desserts.splice(i, 1));
    if (specialEs) editEs((d) => d.desserts.splice(i, 1));
  }
  function addSide() {
    edit((d) => d.sides.push(""));
    if (specialEs) editEs((d) => d.sides.push(""));
  }
  function removeSide(i: number) {
    edit((d) => d.sides.splice(i, 1));
    if (specialEs) editEs((d) => d.sides.splice(i, 1));
  }
  function addFeatured() {
    edit((d) => d.featured.push({ name: "", description: null, price: null }));
    if (specialEs) editEs((d) => d.featured.push({ name: "", description: null, price: null }));
  }
  function removeFeatured(i: number) {
    edit((d) => d.featured.splice(i, 1));
    if (specialEs) editEs((d) => d.featured.splice(i, 1));
  }
  function addSoup() {
    edit((d) => d.soups.push({ name: "", tiers: [] }));
    if (specialEs) editEs((d) => d.soups.push({ name: "", tiers: [] }));
  }
  function removeSoup(i: number) {
    edit((d) => d.soups.splice(i, 1));
    if (specialEs) editEs((d) => d.soups.splice(i, 1));
  }
  function addSoupTier(si: number) {
    edit((d) => d.soups[si].tiers.push({ label: "", price: null }));
    if (specialEs) editEs((d) => d.soups[si].tiers.push({ label: "", price: null }));
  }
  function removeSoupTier(si: number, ti: number) {
    edit((d) => d.soups[si].tiers.splice(ti, 1));
    if (specialEs) editEs((d) => d.soups[si].tiers.splice(ti, 1));
  }
  function addSection() {
    edit((d) => d.additionalSections.push({ title: "", note: null, items: [] }));
    if (specialEs) editEs((d) => d.additionalSections.push({ title: "", note: null, items: [] }));
  }
  function removeSection(i: number) {
    edit((d) => d.additionalSections.splice(i, 1));
    if (specialEs) editEs((d) => d.additionalSections.splice(i, 1));
  }
  function addSectionItem(si: number) {
    edit((d) => d.additionalSections[si].items.push({ name: "", description: null, price: null }));
    if (specialEs) editEs((d) => d.additionalSections[si].items.push({ name: "", description: null, price: null }));
  }
  function removeSectionItem(si: number, ii: number) {
    edit((d) => d.additionalSections[si].items.splice(ii, 1));
    if (specialEs) editEs((d) => d.additionalSections[si].items.splice(ii, 1));
  }

  function pickTheme(id: string) {
    setThemeId(id);
    setDirty(true);
  }

  async function translateToSpanish() {
    if (!special) return;
    setTranslating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/menus/${menuId}/translate-special`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu: special }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? t.errorTranslate);
      }
      const { menu: translated } = await res.json();
      setSpecialEs(translated);
      setShowSpanish(true);
      setDirty(true);
      setMessage(t.translatedMessage);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.errorTranslate);
    } finally {
      setTranslating(false);
    }
  }

  async function saveAndRender() {
    if (!special) return;
    setRendering(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/menus/${menuId}/render-special`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu: special, themeId, menuEs: specialEs }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? t.errorRender);
      }
      const { imageUrl, imageUrlEs } = await res.json();
      setRenderedUrl(imageUrl);
      if (imageUrlEs) setRenderedUrlEs(imageUrlEs);
      setDirty(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.errorRender);
    } finally {
      setRendering(false);
    }
  }

  async function publishNow() {
    setStatus("busy");
    setMessage(null);
    try {
      const res = await fetch(`/api/menus/${menuId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? t.errorPublish);
      }
      setStatus("published");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t.errorPublish);
    }
  }

  async function schedulePublish() {
    if (!scheduleAt) return;
    setStatus("busy");
    setMessage(null);
    try {
      const iso = new Date(scheduleAt).toISOString();
      const res = await fetch(`/api/menus/${menuId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ at: iso }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? t.errorSchedule);
      }
      const { schedule: created } = await res.json();
      setSchedule(created);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : t.errorSchedule);
    }
  }

  async function cancelSchedule() {
    if (!schedule) return;
    setStatus("busy");
    await fetch(`/api/schedules/${schedule.id}`, { method: "DELETE" });
    setSchedule(null);
    setStatus("idle");
  }

  if (status === "published") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">{t.published}</p>
        <Link href="/menu" target="_blank" className="text-sm font-medium text-green-800 underline">
          {t.viewOnSite}
        </Link>
      </div>
    );
  }

  // Legacy image-gen drafts (no structured data): keep the old read-only image + publish path.
  if (!special) {
    return (
      <div className="flex flex-col gap-4">
        {renderedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- public Storage URL
          <img src={renderedUrl} alt={t.generatedImageAlt} className="w-full rounded-lg border border-neutral-200" />
        ) : (
          <p className="text-sm text-neutral-500">{t.noMenuData}</p>
        )}
        <PublishBar
          canPublish={!!renderedUrl && !dirty}
          dirty={false}
          status={status}
          schedule={schedule}
          scheduleAt={scheduleAt}
          setScheduleAt={setScheduleAt}
          onPublish={publishNow}
          onSchedule={schedulePublish}
          onCancelSchedule={cancelSchedule}
          t={t.publishBar}
        />
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      </div>
    );
  }

  const canPublish = !!renderedUrl && !dirty && hasMeaningfulContent(special);
  const lowConf = (c: number) => c < 0.6;
  const entreesNeedReview = special.entrees.some((it) => lowConf(it.confidence));
  const veggieSet = Boolean(special.veggiePlate?.description || special.veggiePlate?.price);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Style + live preview + publish actions — the output, shown first. */}
      <div className="flex flex-col gap-4">
        <SectionCard title={t.style}>
          <div className="flex flex-wrap gap-2">
            {MENU_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => pickTheme(theme.id)}
                className={`rounded-md border px-3 py-1.5 text-sm ${theme.id === themeId ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="overflow-hidden rounded-lg border border-neutral-200">
          {previewDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL preview
            <img src={previewDataUrl} alt={t.livePreviewAlt} className="w-full" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <button
            type="button"
            onClick={translateToSpanish}
            disabled={translating || !hasMeaningfulContent(special)}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {translating ? t.translating : specialEs ? t.reTranslateToSpanish : t.translateToSpanish}
          </button>
          {specialEs && (
            <label className="flex items-center gap-1.5 text-sm text-neutral-600">
              <input type="checkbox" checked={showSpanish} onChange={(e) => setShowSpanish(e.target.checked)} />
              {t.showSpanish}
            </label>
          )}
          {renderedUrlEs && !dirty && <span className="text-xs font-medium text-green-700">{t.spanishSaved}</span>}
        </div>

        {showSpanish && previewDataUrlEs && (
          <div className="overflow-hidden rounded-lg border border-amber-300">
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL preview */}
            <img src={previewDataUrlEs} alt={t.livePreviewAltEs} className="w-full" />
          </div>
        )}

        <button
          type="button"
          onClick={saveAndRender}
          disabled={rendering || !hasMeaningfulContent(special)}
          className="rounded-md border border-neutral-800 bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {rendering
            ? t.rendering
            : dirty
              ? `${t.saveAndRender}${specialEs ? t.englishAndSpanish : ""}`
              : t.renderedUpToDate}
        </button>

        <PublishBar
          canPublish={canPublish}
          dirty={dirty}
          status={status}
          schedule={schedule}
          scheduleAt={scheduleAt}
          setScheduleAt={setScheduleAt}
          onPublish={publishNow}
          onSchedule={schedulePublish}
          onCancelSchedule={cancelSchedule}
          t={t.publishBar}
        />

        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      </div>

      {/* 2. The editable menu — collapsed accordions beneath the preview. */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-neutral-500">{t.editTheMenu}</p>

        {special.uncertainItems.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">{t.uncertainWarning}</p>
            <ul className="mt-2 list-disc pl-5">
              {special.uncertainItems.map((u, i) => (
                <li key={i}>
                  <span className="font-medium">{u.section}:</span> {u.issue}
                  {u.suggestedValue ? t.maybeSuggestion(u.suggestedValue) : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Accordion title={t.header.sectionTitle} summary={special.title?.trim() || t.untitled}>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label={t.header.title}>
              <input value={special.title} onChange={(e) => edit((d) => (d.title = e.target.value))} className={field()} />
            </Labeled>
            <Labeled label={t.header.date}>
              <input value={special.dateText ?? ""} onChange={(e) => edit((d) => (d.dateText = e.target.value || null))} className={field()} />
            </Labeled>
            <Labeled label={t.header.subtitleNote}>
              <input value={special.subtitle ?? ""} onChange={(e) => edit((d) => (d.subtitle = e.target.value || null))} className={field()} />
            </Labeled>
          </div>
          {/* Restaurant name / address / phone are deliberately NOT editable
              here (2026-07-15, owner's call) — the letterhead is standardized
              from the restaurant profile on every render, in both languages.
              Change it in Settings, not per-special. */}
          <p className="mt-3 text-xs text-neutral-400">{t.header.letterheadNote}</p>
          {showSpanish && specialEs && (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-2">
              <Labeled label={t.header.titleEs}>
                <input value={specialEs.title} onChange={(e) => editEs((d) => (d.title = e.target.value))} className={esField()} />
              </Labeled>
              <Labeled label={t.header.dateEs}>
                <input value={specialEs.dateText ?? ""} onChange={(e) => editEs((d) => (d.dateText = e.target.value || null))} className={esField()} />
              </Labeled>
              <Labeled label={t.header.subtitleNoteEs}>
                <input value={specialEs.subtitle ?? ""} onChange={(e) => editEs((d) => (d.subtitle = e.target.value || null))} className={esField()} />
              </Labeled>
            </div>
          )}
        </Accordion>

        <Accordion title={t.entrees.title} summary={t.itemCount(special.entrees.length)} attention={entreesNeedReview}>
          <div className="flex flex-col gap-3">
            {special.entrees.map((it, i) => (
              <div
                key={i}
                className={`rounded-md border p-2 ${lowConf(it.confidence) ? "border-amber-400 bg-amber-50" : "border-neutral-200"}`}
              >
                <div className="flex gap-2">
                  <input
                    placeholder={t.entrees.itemName}
                    value={it.name}
                    onChange={(e) => edit((d) => (d.entrees[i].name = e.target.value))}
                    className={`${field()} flex-1`}
                  />
                  <input
                    placeholder={t.entrees.price}
                    value={it.price ?? ""}
                    onChange={(e) => edit((d) => (d.entrees[i].price = e.target.value || null))}
                    className={priceField()}
                  />
                  <button type="button" onClick={() => removeEntree(i)} className="px-1 text-xs text-red-600 hover:underline">
                    ✕
                  </button>
                </div>
                <input
                  placeholder={t.entrees.description}
                  value={it.description ?? ""}
                  onChange={(e) => edit((d) => (d.entrees[i].description = e.target.value || null))}
                  className={`${field()} mt-2`}
                />
                {lowConf(it.confidence) && <p className="mt-1 text-xs text-amber-700">{t.entrees.lowConfidence}</p>}
                {showSpanish && specialEs?.entrees[i] && (
                  <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
                    <input
                      placeholder={t.entrees.nameEs}
                      value={specialEs.entrees[i].name}
                      onChange={(e) => editEs((d) => (d.entrees[i].name = e.target.value))}
                      className={esField()}
                    />
                    <input
                      placeholder={t.entrees.descriptionEs}
                      value={specialEs.entrees[i].description ?? ""}
                      onChange={(e) => editEs((d) => (d.entrees[i].description = e.target.value || null))}
                      className={esField()}
                    />
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addEntree} className="self-start text-sm font-medium text-neutral-600 hover:underline">
              {t.entrees.addEntree}
            </button>
          </div>
        </Accordion>

        <Accordion title={t.featured.title} summary={special.featured.map((f) => f.name?.trim()).filter(Boolean).join(", ") || t.notSet}>
          <div className="flex flex-col gap-3">
            {special.featured.map((f, i) => (
              <div key={i} className="rounded-md border border-neutral-200 p-2">
                <div className="flex gap-2">
                  <input placeholder={t.featured.name} value={f.name ?? ""} onChange={(e) => edit((d) => (d.featured[i].name = e.target.value || null))} className={`${field()} flex-1`} />
                  <input placeholder={t.featured.price} value={f.price ?? ""} onChange={(e) => edit((d) => (d.featured[i].price = e.target.value || null))} className={priceField()} />
                  <button type="button" onClick={() => removeFeatured(i)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                </div>
                <input placeholder={t.featured.description} value={f.description ?? ""} onChange={(e) => edit((d) => (d.featured[i].description = e.target.value || null))} className={`${field()} mt-2`} />
                {showSpanish && specialEs?.featured[i] && (
                  <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
                    <input placeholder={t.featured.nameEs} value={specialEs.featured[i].name ?? ""} onChange={(e) => editEs((d) => (d.featured[i].name = e.target.value || null))} className={esField()} />
                    <input placeholder={t.featured.descriptionEs} value={specialEs.featured[i].description ?? ""} onChange={(e) => editEs((d) => (d.featured[i].description = e.target.value || null))} className={esField()} />
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addFeatured} className="self-start text-sm font-medium text-neutral-600 hover:underline">{t.featured.addFeatured}</button>
          </div>
        </Accordion>

        <Accordion title={t.soup.title} summary={special.soups.map((s) => s.name?.trim()).filter(Boolean).join(", ") || t.notSet}>
          <div className="flex flex-col gap-3">
            {special.soups.map((s, si) => (
              <div key={si} className="rounded-md border border-neutral-200 p-2">
                <div className="flex gap-2">
                  <input placeholder={t.soup.name} value={s.name ?? ""} onChange={(e) => edit((d) => (d.soups[si].name = e.target.value || null))} className={`${field()} flex-1`} />
                  <button type="button" onClick={() => removeSoup(si)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                </div>
                {showSpanish && specialEs?.soups[si] && (
                  <input placeholder={t.soup.nameEs} value={specialEs.soups[si].name ?? ""} onChange={(e) => editEs((d) => (d.soups[si].name = e.target.value || null))} className={`${esField()} mt-2`} />
                )}
                <div className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-2">
                  {s.tiers.map((tier, ti) => (
                    <div key={ti} className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input placeholder={t.soup.tierLabel} value={tier.label ?? ""} onChange={(e) => edit((d) => (d.soups[si].tiers[ti].label = e.target.value || null))} className={`${field()} flex-1`} />
                        <input placeholder={t.soup.tierPrice} value={tier.price ?? ""} onChange={(e) => edit((d) => (d.soups[si].tiers[ti].price = e.target.value || null))} className={priceField()} />
                        <button type="button" onClick={() => removeSoupTier(si, ti)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                      </div>
                      {showSpanish && specialEs?.soups[si]?.tiers[ti] && (
                        <input placeholder={t.soup.tierLabelEs} value={specialEs.soups[si].tiers[ti].label ?? ""} onChange={(e) => editEs((d) => (d.soups[si].tiers[ti].label = e.target.value || null))} className={esField()} />
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addSoupTier(si)} className="self-start text-xs font-medium text-neutral-600 hover:underline">{t.soup.addTier}</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSoup} className="self-start text-sm font-medium text-neutral-600 hover:underline">{t.soup.addSoup}</button>
          </div>
        </Accordion>

        <Accordion title={t.combos.title} summary={t.itemCount(special.combos.length)}>
          <div className="flex flex-col gap-2">
            {special.combos.map((c, i) => (
              <div key={i}>
                <div className="flex gap-2">
                  <input placeholder={t.combos.name} value={c.name} onChange={(e) => edit((d) => (d.combos[i].name = e.target.value))} className={`${field()} flex-1`} />
                  <input placeholder={t.combos.price} value={c.price ?? ""} onChange={(e) => edit((d) => (d.combos[i].price = e.target.value || null))} className={priceField()} />
                  <button type="button" onClick={() => removeCombo(i)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                </div>
                {showSpanish && specialEs?.combos[i] && (
                  <input
                    placeholder={t.combos.nameEs}
                    value={specialEs.combos[i].name}
                    onChange={(e) => editEs((d) => (d.combos[i].name = e.target.value))}
                    className={`${esField()} mt-2`}
                  />
                )}
              </div>
            ))}
            <button type="button" onClick={addCombo} className="self-start text-sm font-medium text-neutral-600 hover:underline">{t.combos.addCombo}</button>
          </div>
        </Accordion>

        <Accordion title={t.veggie.title} summary={veggieSet ? t.set : t.notSet}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input placeholder={t.veggie.description} value={special.veggiePlate?.description ?? ""} onChange={(e) => edit((d) => (d.veggiePlate = { ...(d.veggiePlate ?? { description: null, price: null }), description: e.target.value || null }))} className={`${field()} sm:col-span-2`} />
            <input placeholder={t.veggie.price} value={special.veggiePlate?.price ?? ""} onChange={(e) => edit((d) => (d.veggiePlate = { ...(d.veggiePlate ?? { description: null, price: null }), price: e.target.value || null }))} className={field()} />
          </div>
          {showSpanish && specialEs?.veggiePlate && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
              <input
                placeholder={t.veggie.descriptionEs}
                value={specialEs.veggiePlate.description ?? ""}
                onChange={(e) => editEs((d) => { if (d.veggiePlate) d.veggiePlate.description = e.target.value || null; })}
                className={esField()}
              />
            </div>
          )}
        </Accordion>

        <Accordion title={t.desserts.title} summary={special.dessertsLabel?.trim() || t.itemCount(special.desserts.length)}>
          <div className="flex flex-col gap-2">
            <input
              placeholder={t.desserts.sectionLabel}
              value={special.dessertsLabel ?? ""}
              onChange={(e) => edit((d) => (d.dessertsLabel = e.target.value || null))}
              className={field()}
            />
            {showSpanish && specialEs && (
              <input
                placeholder={t.desserts.sectionLabelEs}
                value={specialEs.dessertsLabel ?? ""}
                onChange={(e) => editEs((d) => (d.dessertsLabel = e.target.value || null))}
                className={esField()}
              />
            )}
            {special.desserts.map((c, i) => (
              <div key={i}>
                <div className="flex gap-2">
                  <input placeholder={t.desserts.name} value={c.name} onChange={(e) => edit((d) => (d.desserts[i].name = e.target.value))} className={`${field()} flex-1`} />
                  <input placeholder={t.desserts.price} value={c.price ?? ""} onChange={(e) => edit((d) => (d.desserts[i].price = e.target.value || null))} className={priceField()} />
                  <button type="button" onClick={() => removeDessert(i)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                </div>
                {showSpanish && specialEs?.desserts[i] && (
                  <input
                    placeholder={t.desserts.nameEs}
                    value={specialEs.desserts[i].name}
                    onChange={(e) => editEs((d) => (d.desserts[i].name = e.target.value))}
                    className={`${esField()} mt-2`}
                  />
                )}
              </div>
            ))}
            <button type="button" onClick={addDessert} className="self-start text-sm font-medium text-neutral-600 hover:underline">{t.desserts.addDessert}</button>
          </div>
        </Accordion>

        <Accordion title={t.sides.title} summary={t.itemCount(special.sides.length)}>
          <div className="flex flex-col gap-2">
            {special.sides.map((s, i) => (
              <div key={i}>
                <div className="flex gap-2">
                  <input value={s} onChange={(e) => edit((d) => (d.sides[i] = e.target.value))} className={`${field()} flex-1`} />
                  <button type="button" onClick={() => removeSide(i)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                </div>
                {showSpanish && specialEs?.sides[i] !== undefined && (
                  <input
                    placeholder={t.sides.spanishPlaceholder}
                    value={specialEs.sides[i]}
                    onChange={(e) => editEs((d) => (d.sides[i] = e.target.value))}
                    className={`${esField()} mt-2`}
                  />
                )}
              </div>
            ))}
            <button type="button" onClick={addSide} className="self-start text-sm font-medium text-neutral-600 hover:underline">{t.sides.addSide}</button>
          </div>
        </Accordion>

        <Accordion
          title={t.additional.title}
          summary={special.additionalSections.map((s) => s.title?.trim()).filter(Boolean).join(", ") || t.additional.summaryEmpty}
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-neutral-400">{t.additional.help}</p>
            {special.additionalSections.map((sec, si) => (
              <div key={si} className="rounded-md border border-neutral-300 p-3">
                <div className="flex gap-2">
                  <input placeholder={t.additional.sectionTitle} value={sec.title} onChange={(e) => edit((d) => (d.additionalSections[si].title = e.target.value))} className={`${field()} flex-1 font-semibold`} />
                  <button type="button" onClick={() => removeSection(si)} className="px-1 text-xs text-red-600 hover:underline">{t.additional.removeSection}</button>
                </div>
                <input placeholder={t.additional.note} value={sec.note ?? ""} onChange={(e) => edit((d) => (d.additionalSections[si].note = e.target.value || null))} className={`${field()} mt-2`} />
                {showSpanish && specialEs?.additionalSections[si] && (
                  <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
                    <input placeholder={t.additional.sectionTitleEs} value={specialEs.additionalSections[si].title} onChange={(e) => editEs((d) => (d.additionalSections[si].title = e.target.value))} className={esField()} />
                    <input placeholder={t.additional.noteEs} value={specialEs.additionalSections[si].note ?? ""} onChange={(e) => editEs((d) => (d.additionalSections[si].note = e.target.value || null))} className={esField()} />
                  </div>
                )}
                <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-2">
                  {sec.items.map((it, ii) => (
                    <div key={ii}>
                      <div className="flex gap-2">
                        <input placeholder={t.additional.itemName} value={it.name} onChange={(e) => edit((d) => (d.additionalSections[si].items[ii].name = e.target.value))} className={`${field()} flex-1`} />
                        <input placeholder={t.additional.itemPrice} value={it.price ?? ""} onChange={(e) => edit((d) => (d.additionalSections[si].items[ii].price = e.target.value || null))} className={priceField()} />
                        <button type="button" onClick={() => removeSectionItem(si, ii)} className="px-1 text-xs text-red-600 hover:underline">✕</button>
                      </div>
                      <input placeholder={t.additional.itemDescription} value={it.description ?? ""} onChange={(e) => edit((d) => (d.additionalSections[si].items[ii].description = e.target.value || null))} className={`${field()} mt-2`} />
                      {showSpanish && specialEs?.additionalSections[si]?.items[ii] && (
                        <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
                          <input placeholder={t.additional.itemNameEs} value={specialEs.additionalSections[si].items[ii].name} onChange={(e) => editEs((d) => (d.additionalSections[si].items[ii].name = e.target.value))} className={esField()} />
                          <input placeholder={t.additional.itemDescriptionEs} value={specialEs.additionalSections[si].items[ii].description ?? ""} onChange={(e) => editEs((d) => (d.additionalSections[si].items[ii].description = e.target.value || null))} className={esField()} />
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addSectionItem(si)} className="self-start text-xs font-medium text-neutral-600 hover:underline">{t.additional.addItem}</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSection} className="self-start text-sm font-medium text-neutral-600 hover:underline">{t.additional.addSection}</button>
          </div>
        </Accordion>
      </div>
    </div>
  );
}

function PublishBar({
  canPublish,
  dirty,
  status,
  schedule,
  scheduleAt,
  setScheduleAt,
  onPublish,
  onSchedule,
  onCancelSchedule,
  t,
}: {
  canPublish: boolean;
  dirty: boolean;
  status: "idle" | "busy" | "published" | "error";
  schedule: PublishSchedule | null;
  scheduleAt: string;
  setScheduleAt: (v: string) => void;
  onPublish: () => void;
  onSchedule: () => void;
  onCancelSchedule: () => void;
  t: Dictionary["admin"]["review"]["publishBar"];
}) {
  if (schedule) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">{t.scheduledToGoLive(new Date(schedule.fire_at).toLocaleString())}</p>
        <button type="button" onClick={onCancelSchedule} disabled={status === "busy"} className="mt-2 text-xs font-medium text-red-700 hover:underline disabled:opacity-50">
          {t.cancelSchedule}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPublish}
          disabled={status === "busy" || !canPublish}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "busy" ? t.publishing : t.publishNow}
        </button>
        <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        <button type="button" onClick={onSchedule} disabled={status === "busy" || !canPublish || !scheduleAt} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {t.schedule}
        </button>
      </div>
      {dirty && <p className="text-xs text-neutral-500">{t.saveBeforePublish}</p>}
    </div>
  );
}
