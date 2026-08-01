"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeRenderer } from "@/lib/themes/registry";
import type { PublishedSnapshot } from "@/types/database";

function snapshotLabel(snapshot: PublishedSnapshot): string {
  const title = snapshot.payload.menu.title?.trim();
  if (title) return title;

  const menuDate = snapshot.payload.menu.service_date;
  const date = menuDate ? new Date(`${menuDate}T12:00:00`) : new Date(snapshot.published_at);
  return `Daily special — ${date.toLocaleDateString([], { dateStyle: "medium" })}`;
}

export function HistoryList({ snapshots, liveSnapshotId }: { snapshots: PublishedSnapshot[]; liveSnapshotId: string | null }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function republish(id: string) {
    setBusyId(id);
    await fetch(`/api/snapshots/${id}/republish`, { method: "POST" });
    setBusyId(null);
    router.refresh();
  }

  if (snapshots.length === 0) {
    return <p className="text-sm text-neutral-400">Nothing published yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {snapshots.map((snapshot) => {
        const isLive = snapshot.id === liveSnapshotId;
        const expanded = expandedId === snapshot.id;
        return (
          <div key={snapshot.id} className="rounded-lg border border-neutral-200">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 p-3">
              <div className="min-w-0 max-w-full">
                <p className="truncate text-sm font-medium">{snapshotLabel(snapshot)}</p>
                <p className="truncate text-xs text-neutral-500">
                  {new Date(snapshot.published_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} · {snapshot.payload.theme.key}
                </p>
              </div>
              {isLive && <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Live now</span>}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : snapshot.id)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                {expanded ? "Hide" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => republish(snapshot.id)}
                disabled={isLive || busyId === snapshot.id}
                className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
              >
                {busyId === snapshot.id ? "Re-publishing…" : "Re-publish"}
              </button>
            </div>
            {expanded && (
              <div className="border-t border-neutral-200">
                <ThemeRenderer themeKey={snapshot.payload.theme.key} payload={snapshot.payload} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
