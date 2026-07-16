"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailFaxRequest } from "@/lib/email-fax/service";
import type { DayKey } from "@/lib/email-fax/schema";

const METHOD_LABEL: Record<EmailFaxRequest["method"], string> = {
  fax: "Fax",
  email: "Email",
  both: "Both",
};

// Short English day labels for the owner's table; the public form shows the
// visitor full localized names (common.days), but this screen is
// English-only like the rest of the owner-only admin.
const DAY_LABEL: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Checkbox multi-select + bulk delete, same interaction as SubscribersTable. */
export function EmailFaxTable({ initialRequests }: { initialRequests: EmailFaxRequest[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = initialRequests.length > 0 && selected.size === initialRequests.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(initialRequests.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!window.confirm(`Delete ${count} request${count === 1 ? "" : "s"}? This can't be undone.`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-fax-list", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error("Could not delete the selected requests.");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={handleDeleteSelected}
          className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete selected{selected.size > 0 ? ` (${selected.size})` : ""}
        </button>
      </div>

      {initialRequests.length === 0 ? (
        <p className="text-sm text-neutral-500">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-3 py-2 font-medium">Business / name</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Fax</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Days</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {initialRequests.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Select ${r.business_name}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{r.business_name}</td>
                  <td className="px-3 py-2">{METHOD_LABEL[r.method]}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.fax ?? "—"}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {r.days.length === 0 ? "Every day" : r.days.map((d) => DAY_LABEL[d]).join(", ")}
                  </td>
                  <td className="max-w-56 px-3 py-2 text-neutral-600">
                    {r.notes ? <span className="line-clamp-3" title={r.notes}>{r.notes}</span> : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
