"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscaleImageWithFormat, PUBLIC_PHOTO } from "@/lib/uploads/downscale";
import type { MainMenuWithContent } from "@/lib/main-menu/service";
import type { MainMenuCategory } from "@/types/database";

const CATEGORY_LABEL: Record<MainMenuCategory, string> = {
  breakfast: "Breakfast",
  lunch_dinner: "Lunch & Dinner",
  beverages: "Beverages",
};

interface EditableItem {
  key: string;
  name: string;
  description: string;
  nameEs: string;
  descriptionEs: string;
  price: string; // dollars, as typed
  priceNote: string;
  imagePath: string | null;
  imageUrl: string | null; // derived preview URL; null until an image exists or is uploaded
  isNew: boolean; // true until the first Save persists it — image upload needs a real DB id
}

interface EditableSection {
  key: string;
  name: string;
  description: string;
  nameEs: string;
  descriptionEs: string;
  category: MainMenuCategory;
  items: EditableItem[];
}

/** id → translated {name, description}, keyed by the section/item `key` sent in the translate request. */
interface TranslationResult {
  id: string;
  name: string;
  description: string | null;
}

function centsToDollars(cents: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function pathToPublicUrl(path: string | null): string | null {
  if (!path) return null;
  return createClient().storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

function fromMainMenu(sections: MainMenuWithContent["sections"]): EditableSection[] {
  return sections.map((section) => ({
    key: section.id,
    name: section.name,
    description: section.description ?? "",
    nameEs: section.name_es ?? "",
    descriptionEs: section.description_es ?? "",
    category: section.category,
    items: section.main_menu_items.map((item) => ({
      key: item.id,
      name: item.name,
      description: item.description ?? "",
      nameEs: item.name_es ?? "",
      descriptionEs: item.description_es ?? "",
      price: centsToDollars(item.price_cents),
      priceNote: item.price_note ?? "",
      imagePath: item.image_path,
      imageUrl: pathToPublicUrl(item.image_path),
      isNew: false,
    })),
  }));
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k${Math.random()}`;
}

function fieldClass() {
  return "rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
}

/** Same shape as fieldClass() but visually distinct (amber tint) so a Spanish field is never mistaken for the English one next to it. */
function esFieldClass() {
  return "rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none";
}

export function MainMenuEditor({ initialSections }: { initialSections: MainMenuWithContent["sections"] }) {
  const [sections, setSections] = useState<EditableSection[]>(() => fromMainMenu(initialSections));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyImageKey, setBusyImageKey] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showSpanish, setShowSpanish] = useState(false);

  function updateItem(sectionKey: string, itemKey: string, patch: Partial<EditableItem>) {
    setSections((prev) =>
      prev.map((s) =>
        s.key !== sectionKey
          ? s
          : { ...s, items: s.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)) }
      )
    );
  }

  function updateSection(
    sectionKey: string,
    patch: Partial<Pick<EditableSection, "name" | "description" | "nameEs" | "descriptionEs" | "category">>
  ) {
    setSections((prev) => prev.map((s) => (s.key === sectionKey ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { key: newKey(), name: "New section", description: "", nameEs: "", descriptionEs: "", category: "lunch_dinner", items: [] },
    ]);
  }

  function removeSection(sectionKey: string) {
    setSections((prev) => prev.filter((s) => s.key !== sectionKey));
  }

  function addItem(sectionKey: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key !== sectionKey
          ? s
          : {
              ...s,
              items: [
                ...s.items,
                {
                  key: newKey(),
                  name: "",
                  description: "",
                  nameEs: "",
                  descriptionEs: "",
                  price: "",
                  priceNote: "",
                  imagePath: null,
                  imageUrl: null,
                  isNew: true,
                },
              ],
            }
      )
    );
  }

  function removeItem(sectionKey: string, itemKey: string) {
    setSections((prev) =>
      prev.map((s) => (s.key !== sectionKey ? s : { ...s, items: s.items.filter((it) => it.key !== itemKey) }))
    );
  }

  async function handleItemImage(sectionKey: string, itemId: string, file: File) {
    setMessage(null);
    setBusyImageKey(itemId);
    try {
      // Same PUBLIC_PHOTO policy as Site Photos — these render on the public
      // /menu page, so they get WebP q90 + the immutable cache header too
      // (they had neither until 2026-07-16).
      const { file: downscaled, ext } = await downscaleImageWithFormat(file, PUBLIC_PHOTO);

      const targetRes = await fetch(`/api/main-menu/items/${itemId}/image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ext }),
      });
      if (!targetRes.ok) throw new Error("Could not prepare the upload.");
      const { path, token } = await targetRes.json();

      const supabase = createClient();
      // Immutable: item-image paths are UUID-unique, so a replacement is
      // always a new URL and a cached copy can never go stale.
      const { error: uploadError } = await supabase.storage
        .from("site-media")
        .uploadToSignedUrl(path, token, downscaled, { cacheControl: "31536000" });
      if (uploadError) throw uploadError;

      await fetch(`/api/main-menu/items/${itemId}/image/confirm`, { method: "POST" });

      updateItem(sectionKey, itemId, { imagePath: path, imageUrl: pathToPublicUrl(path) });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setBusyImageKey(null);
    }
  }

  async function handleRemoveItemImage(sectionKey: string, itemId: string) {
    setMessage(null);
    setBusyImageKey(itemId);
    try {
      const res = await fetch(`/api/main-menu/items/${itemId}/image`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove image.");
      updateItem(sectionKey, itemId, { imagePath: null, imageUrl: null });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to remove image.");
    } finally {
      setBusyImageKey(null);
    }
  }

  /**
   * Translates whatever section/item name+description text doesn't already
   * have a Spanish version — so re-running after adding a few new items only
   * fills the gaps, never clobbers Spanish text the owner already reviewed
   * or hand-edited. Nothing is saved to the database here; the result just
   * populates the (now-revealed) Spanish fields for the owner to review and
   * correct before hitting Save, same as every other field in this editor.
   */
  async function translateToSpanish() {
    const units: { id: string; name: string; description: string | null }[] = [];
    for (const s of sections) {
      if (!s.nameEs.trim()) units.push({ id: s.key, name: s.name, description: s.description || null });
      for (const it of s.items) {
        if (!it.nameEs.trim()) units.push({ id: it.key, name: it.name, description: it.description || null });
      }
    }

    if (units.length === 0) {
      setMessage("Everything already has a Spanish translation.");
      return;
    }

    setTranslating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/main-menu/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ units }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Translation failed.");
      }
      const { translations } = (await res.json()) as { translations: TranslationResult[] };
      const byId = new Map(translations.map((t) => [t.id, t]));

      setSections((prev) =>
        prev.map((s) => {
          const sectionTranslation = byId.get(s.key);
          return {
            ...s,
            nameEs: sectionTranslation ? sectionTranslation.name : s.nameEs,
            descriptionEs: sectionTranslation ? (sectionTranslation.description ?? "") : s.descriptionEs,
            items: s.items.map((it) => {
              const itemTranslation = byId.get(it.key);
              return itemTranslation
                ? { ...it, nameEs: itemTranslation.name, descriptionEs: itemTranslation.description ?? "" }
                : it;
            }),
          };
        })
      );
      setShowSpanish(true);
      setMessage(`Translated ${translations.length} item${translations.length === 1 ? "" : "s"} — review below, then Save.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Translation failed.");
    } finally {
      setTranslating(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/main-menu", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sections: sections.map((s) => ({
            name: s.name,
            description: s.description || null,
            name_es: s.nameEs || null,
            description_es: s.descriptionEs || null,
            category: s.category,
            items: s.items.map((it) => ({
              name: it.name,
              description: it.description || null,
              name_es: it.nameEs || null,
              description_es: it.descriptionEs || null,
              price_cents: dollarsToCents(it.price),
              price_note: it.priceNote || null,
              image_path: it.imagePath,
            })),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save.");
      }
      setMessage("Saved — live on your site now.");
      // Full reload rather than router.refresh(): replace_main_menu deletes
      // and reinserts every row (new ids), and per-item image upload needs
      // fresh, accurate ids afterward — a soft refresh wouldn't reset this
      // component's already-initialized state.
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {sections.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <button
            type="button"
            onClick={translateToSpanish}
            disabled={translating}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {translating ? "Translating…" : "Translate to Spanish"}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <input type="checkbox" checked={showSpanish} onChange={(e) => setShowSpanish(e.target.checked)} />
            Show Spanish fields
          </label>
          <span className="text-xs text-neutral-400">Only untranslated items are sent each time — review, edit, then Save.</span>
        </div>
      )}

      {sections.length === 0 && (
        <p className="text-sm text-neutral-500">No sections yet — add one to start building your main menu.</p>
      )}

      {sections.map((section) => (
        <div key={section.key} className="rounded-lg border border-neutral-200 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={section.name}
              onChange={(e) => updateSection(section.key, { name: e.target.value })}
              className={`${fieldClass()} min-w-[10rem] flex-1 font-semibold`}
            />
            <select
              value={section.category}
              onChange={(e) => updateSection(section.key, { category: e.target.value as MainMenuCategory })}
              className={fieldClass()}
            >
              {(Object.keys(CATEGORY_LABEL) as MainMenuCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => removeSection(section.key)} className="text-xs text-red-600 hover:underline">
              Remove section
            </button>
          </div>

          <textarea
            placeholder="Section note shown to customers (e.g. &quot;Served with soup or side salad and choice of one side&quot;)"
            value={section.description}
            onChange={(e) => updateSection(section.key, { description: e.target.value })}
            rows={2}
            className={`${fieldClass()} mb-3 w-full`}
          />

          {showSpanish && (
            <div className="mb-3 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
              <input
                placeholder="Nombre de la sección (Spanish)"
                value={section.nameEs}
                onChange={(e) => updateSection(section.key, { nameEs: e.target.value })}
                className={`${esFieldClass()} w-full font-semibold`}
              />
              <textarea
                placeholder="Nota de la sección (Spanish, optional)"
                value={section.descriptionEs}
                onChange={(e) => updateSection(section.key, { descriptionEs: e.target.value })}
                rows={2}
                className={`${esFieldClass()} w-full`}
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {section.items.map((item) => (
              <div key={item.key} className="rounded-md border border-neutral-200 p-3">
                {/* Mobile: name on its own row, then price + note share a row.
                    Tablet+: name (widest) · price · note in one line. */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
                  <input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(section.key, item.key, { name: e.target.value })}
                    className={`${fieldClass()} col-span-2 w-full sm:col-span-1`}
                  />
                  <input
                    placeholder="Price"
                    inputMode="decimal"
                    value={item.price}
                    onChange={(e) => updateItem(section.key, item.key, { price: e.target.value })}
                    className={`${fieldClass()} w-full`}
                  />
                  <input
                    placeholder="Price note (e.g. MP, seasonal)"
                    value={item.priceNote}
                    onChange={(e) => updateItem(section.key, item.key, { priceNote: e.target.value })}
                    className={`${fieldClass()} w-full`}
                  />
                </div>
                <textarea
                  placeholder="Description (optional)"
                  value={item.description}
                  onChange={(e) => updateItem(section.key, item.key, { description: e.target.value })}
                  rows={2}
                  className={`${fieldClass()} mt-2 w-full`}
                />

                {showSpanish && (
                  <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
                    <input
                      placeholder="Nombre del platillo (Spanish)"
                      value={item.nameEs}
                      onChange={(e) => updateItem(section.key, item.key, { nameEs: e.target.value })}
                      className={`${esFieldClass()} w-full`}
                    />
                    <textarea
                      placeholder="Descripción (Spanish, optional)"
                      value={item.descriptionEs}
                      onChange={(e) => updateItem(section.key, item.key, { descriptionEs: e.target.value })}
                      rows={2}
                      className={`${esFieldClass()} w-full`}
                    />
                  </div>
                )}

                <div className="mt-2 flex items-center gap-3">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- public Storage URL, not a local/optimizable asset
                    <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-md border border-neutral-200 object-cover" />
                  )}
                  {item.isNew ? (
                    <span className="text-xs text-neutral-400">Save this item first to add a photo</span>
                  ) : (
                    <>
                      <input
                        id={`item-image-input-${item.key}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleItemImage(section.key, item.key, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={busyImageKey === item.key}
                        onClick={() => document.getElementById(`item-image-input-${item.key}`)?.click()}
                        className="text-xs font-medium text-neutral-600 hover:underline disabled:opacity-50"
                      >
                        {busyImageKey === item.key ? "Uploading…" : item.imageUrl ? "Replace image" : "Add image"}
                      </button>
                      {item.imageUrl && (
                        <button
                          type="button"
                          disabled={busyImageKey === item.key}
                          onClick={() => handleRemoveItemImage(section.key, item.key)}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          Remove image
                        </button>
                      )}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(section.key, item.key)}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  Remove item
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem(section.key)}
              className="self-start text-sm font-medium text-neutral-600 hover:underline"
            >
              + Add item
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addSection} className="self-start text-sm font-medium text-neutral-600 hover:underline">
        + Add section
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message && <span className="text-sm text-neutral-600">{message}</span>}
      </div>
    </div>
  );
}
