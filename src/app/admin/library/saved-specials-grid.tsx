"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SavedSpecial } from "@/lib/menu/saved-specials-service";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export function SavedSpecialsGrid({ initialSpecials }: { initialSpecials: SavedSpecial[] }) {
  const router = useRouter();
  const [specials, setSpecials] = useState(initialSpecials);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not delete this special.");
      setSpecials((prev) => prev.filter((s) => s.id !== id));
      setConfirmingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specials.map((s) => {
          const label = s.dateText ?? new Date(s.createdAt).toLocaleDateString();
          const canDelete = s.status === "draft" && !s.isLive;
          const confirming = confirmingId === s.id;
          return (
          <div key={s.id} className="flex flex-col overflow-hidden rounded-lg border border-neutral-200">
            <Link href={`/admin/menus/${s.id}/review`} className="block bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- public Storage SVG URL */}
              <img src={s.imageUrl} alt={label} className="w-full" />
            </Link>
            <div className="flex items-center gap-2 border-t border-neutral-200 px-3 py-2 text-sm">
              <span className="flex-1 truncate">{label}</span>
              {s.isLive ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Live</span>
              ) : (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{STATUS_LABEL[s.status] ?? s.status}</span>
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-neutral-200 px-3 py-2">
              <Link href={`/admin/menus/${s.id}/review`} className="text-xs font-medium text-neutral-700 hover:underline">
                Open
              </Link>
              {canDelete ? (
                confirming ? (
                  <div
                    className="ml-auto flex flex-wrap items-center justify-end gap-2"
                    role="alertdialog"
                    aria-label={`Delete ${label}?`}
                  >
                    <span className="w-full text-right text-xs text-red-700">Delete permanently? This cannot be undone.</span>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={busyId === s.id}
                      className="text-xs font-medium text-neutral-600 hover:underline disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      disabled={busyId === s.id}
                      className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      {busyId === s.id ? "Deleting…" : "Delete permanently"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setConfirmingId(s.id);
                    }}
                    className="ml-auto text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )
              ) : (
                <span className="ml-auto text-xs text-neutral-400">Kept in History</span>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
