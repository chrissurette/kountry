"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublishTargetView, SocialPostView } from "@/lib/social/targets-service";

const KIND_LABEL: Record<PublishTargetView["kind"], string> = {
  facebook_page: "Facebook Page",
  instagram_business: "Instagram",
};

/** Callback flags from /api/social/meta/callback — never a raw Meta error, always something the owner can act on. */
const STATUS_MESSAGE: Record<string, { text: string; tone: "ok" | "warn" | "error" }> = {
  connected: { text: "Connected. Your daily special will post to Facebook and Instagram from now on.", tone: "ok" },
  connected_no_ig: {
    text: "Facebook connected. Instagram wasn't found — link your Instagram business account to your Facebook Page, then reconnect here to add it.",
    tone: "warn",
  },
  cancelled: { text: "Connection cancelled — nothing changed.", tone: "warn" },
  no_pages: { text: "That Facebook account doesn't manage any Pages, so there's nothing to post to.", tone: "error" },
  invalid_state: { text: "That connection link expired. Please try connecting again.", tone: "error" },
  not_configured: { text: "Facebook isn't set up on this site yet (missing app credentials).", tone: "error" },
  failed: { text: "Could not finish connecting to Facebook. Please try again.", tone: "error" },
};

/**
 * Settings → Social accounts (docs/10), sitting beside AI Providers because
 * it's the same kind of thing: the owner connecting their own third-party
 * account to this app.
 *
 * The access token is never rendered — not masked, not last-4, not at all.
 * The row is identified by what it *is* (Page name, connected date), exactly
 * as provider keys are. `PublishTargetView`'s column allowlist is what makes
 * that structural rather than a habit.
 */
export function SocialPanel({
  targets,
  recentPosts,
  configured,
  statusFlag,
}: {
  targets: PublishTargetView[];
  recentPosts: SocialPostView[];
  /** False when META_APP_ID/SECRET aren't set — the feature is inert, and saying so beats a Connect button that 500s. */
  configured: boolean;
  statusFlag: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = statusFlag ? STATUS_MESSAGE[statusFlag] : null;
  const connected = targets.length > 0;

  async function toggleTarget(id: string, enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/social/meta", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) throw new Error("Could not update that account.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Facebook and Instagram? Your daily special will stop posting to them.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/social/meta", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not disconnect.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="mb-1 font-medium">Social accounts</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Connect your Facebook Page and Instagram business account, and each daily special you publish will be posted
        to them automatically. Publishing to your own site never waits on this — if a post fails, you&rsquo;ll see it
        below.
      </p>

      {status && (
        <p
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            status.tone === "ok"
              ? "bg-green-50 text-green-800"
              : status.tone === "warn"
                ? "bg-amber-50 text-amber-900"
                : "bg-red-50 text-red-800"
          }`}
        >
          {status.text}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!configured ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          Not set up yet. Facebook publishing needs a Meta app — see <code>docs/10-meta-publishing.md</code> for the
          one-time setup, then add <code>META_APP_ID</code> and <code>META_APP_SECRET</code> to this site&rsquo;s
          environment variables.
        </p>
      ) : !connected ? (
        <a
          href="/api/social/meta/connect"
          className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Connect Facebook &amp; Instagram
        </a>
      ) : (
        <div className="flex flex-col gap-3">
          {targets.map((target) => (
            <div
              key={target.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{target.display_name}</p>
                <p className="text-xs text-neutral-500">
                  {KIND_LABEL[target.kind]} · connected {new Date(target.connected_at).toLocaleDateString()}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={target.enabled}
                  disabled={busy}
                  onChange={(e) => toggleTarget(target.id, e.target.checked)}
                />
                Post here
              </label>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <a href="/api/social/meta/connect" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium">
              Reconnect
            </a>
            <button
              type="button"
              onClick={disconnect}
              disabled={busy}
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {recentPosts.length > 0 && (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <h3 className="mb-2 text-sm font-medium">Recent posts</h3>
          <ul className="flex flex-col gap-1.5 text-xs">
            {recentPosts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    post.status === "posted" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {post.status === "posted" ? "Posted" : "Failed"}
                </span>
                <span className="text-neutral-600">{KIND_LABEL[post.kind]}</span>
                <span className="text-neutral-400">{new Date(post.created_at).toLocaleString()}</span>
                {post.error && <span className="w-full text-red-700">{post.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
