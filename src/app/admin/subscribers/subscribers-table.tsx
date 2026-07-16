"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Subscriber } from "@/types/database";
import type { SubscriberListItem } from "@/lib/subscribers/service";

const SOURCE_LABEL: Record<Subscriber["source"], string> = {
  homepage: "Homepage",
  manual: "Manual",
};

export function SubscribersTable({ initialSubscribers }: { initialSubscribers: SubscriberListItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");

  const allSelected = initialSubscribers.length > 0 && selected.size === initialSubscribers.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(initialSubscribers.map((s) => s.id)));
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
    if (!window.confirm(`Delete ${count} subscriber${count === 1 ? "" : "s"}? This can't be undone.`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribers", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error("Could not delete the selected subscribers.");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSubscriber(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim() || null, phone: addPhone.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not add subscriber.");
      }
      setAddEmail("");
      setAddPhone("");
      setShowAddForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed.");
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
          disabled={busy}
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {showAddForm ? "Cancel" : "Add subscriber"}
        </button>
        <a
          href="/api/subscribers/export"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          title="CSV of everyone still subscribed, each with their own unsubscribe link"
        >
          Export emails
        </a>
        <a
          href="/api/subscribers/export/phones"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          title="CSV of every still-subscribed phone number with its unsubscribe link — for manual contact only; sending marketing texts needs written consent this signup doesn't collect"
        >
          Export phones
        </a>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={handleDeleteSelected}
          className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete selected{selected.size > 0 ? ` (${selected.size})` : ""}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubscriber}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              placeholder="name@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Phone
            <input
              type="tel"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              placeholder="(555) 555-5555"
            />
          </label>
          <button
            type="submit"
            disabled={busy || (!addEmail.trim() && !addPhone.trim())}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      {initialSubscribers.length === 0 ? (
        <p className="text-sm text-neutral-500">No subscribers yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {initialSubscribers.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleOne(s.id)}
                      aria-label={`Select ${s.email ?? s.phone ?? s.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">{s.email ?? "—"}</td>
                  <td className="px-3 py-2">{s.phone ?? "—"}</td>
                  <td className="px-3 py-2">
                    {s.unsubscribed_at ? (
                      <span
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                        title={`Unsubscribed ${new Date(s.unsubscribed_at).toLocaleDateString()}`}
                      >
                        Unsubscribed
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Subscribed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{SOURCE_LABEL[s.source]}</td>
                  <td className="px-3 py-2 text-neutral-500">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
