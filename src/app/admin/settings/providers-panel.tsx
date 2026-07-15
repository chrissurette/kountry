"use client";

import { useState } from "react";
import type { ProviderCredential, ProviderId } from "@/types/database";

const PROVIDER_LABEL: Record<ProviderId, string> = { gemini: "Gemini", openai: "OpenAI", xai: "xAI Grok" };

function fieldClass() {
  return "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
}

export function ProvidersPanel({
  initialCredentials,
  initialImageGenConfig,
}: {
  initialCredentials: ProviderCredential[];
  initialImageGenConfig: { provider: ProviderId; model: string };
}) {
  const [credentials, setCredentials] = useState<ProviderCredential[]>(initialCredentials);
  const [apiKey, setApiKey] = useState("");
  const [imageGenModel, setImageGenModel] = useState(initialImageGenConfig.model);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Re-fetches after a mutation (add/remove/test a key, save the model) —
  // never called from an effect, only from these event handlers, so there's
  // no mount-time fetch-and-setState to worry about (initial data comes from
  // the server component in page.tsx instead).
  async function refresh() {
    const [keysRes, configRes] = await Promise.all([
      fetch("/api/providers/keys"),
      fetch("/api/providers/task-config"),
    ]);
    if (keysRes.ok) {
      const { credentials } = await keysRes.json();
      setCredentials(credentials);
    }
    if (configRes.ok) {
      const { taskConfig } = await configRes.json();
      const imageGen = taskConfig.find((t: { task: string }) => t.task === "image_gen");
      if (imageGen) setImageGenModel(imageGen.model);
    }
  }

  async function addKey() {
    if (!apiKey.trim()) return;
    setMessage(null);
    const res = await fetch("/api/providers/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: apiKey.trim() }),
    });
    if (res.ok) {
      setApiKey("");
      await refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed to save key." }));
      setMessage(error);
    }
  }

  async function testKey(id: string) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/providers/keys/${id}/test`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Key is ${body.status}.` : body.error ?? "Test failed.");
    setBusyId(null);
    await refresh();
  }

  async function removeKey(id: string) {
    setBusyId(id);
    await fetch(`/api/providers/keys/${id}`, { method: "DELETE" });
    setBusyId(null);
    await refresh();
  }

  async function saveImageGenConfig() {
    await fetch("/api/providers/task-config", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task: "image_gen", provider: "openai", model: imageGenModel }),
    });
    setMessage("Daily Specials image model saved.");
  }

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="text-base font-semibold">AI Providers</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Your own API keys, encrypted at rest — never exposed to the browser or logged.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {credentials.length === 0 && <p className="text-sm text-neutral-400">No keys added yet.</p>}
        {credentials.map((cred) => (
          <div key={cred.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm">
            <span className="font-medium">{PROVIDER_LABEL[cred.provider]}</span>
            <span className="text-neutral-400">•••• {cred.key_last4}</span>
            <span
              className={
                cred.status === "active" ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800" : "rounded bg-red-100 px-2 py-0.5 text-xs text-red-800"
              }
            >
              {cred.status}
            </span>
            <button
              type="button"
              onClick={() => testKey(cred.id)}
              disabled={busyId === cred.id}
              className="ml-auto text-xs font-medium text-neutral-600 hover:underline disabled:opacity-50"
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => removeKey(cred.id)}
              disabled={busyId === cred.id}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <label className="text-sm font-medium">Add / replace a key</label>
        <div className="flex gap-2">
          <span className={`${fieldClass()} flex items-center bg-neutral-50 text-neutral-500`}>OpenAI</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your API key"
            className={`${fieldClass()} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={addKey}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-neutral-400">OpenAI is the only provider supported today — more are coming later.</p>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <label className="text-sm font-medium">Daily Specials image model (image_gen)</label>
        <div className="flex gap-2">
          <span className={`${fieldClass()} flex items-center bg-neutral-50 text-neutral-500`}>OpenAI</span>
          <input
            value={imageGenModel}
            onChange={(e) => setImageGenModel(e.target.value)}
            className={`${fieldClass()} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={saveImageGenConfig}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Used to redraw a photographed menu into a styled Daily Special image (New Daily Special →
          Review &amp; Publish). OpenAI is the only provider with image generation wired up so far — more
          coming later.
        </p>
      </div>

      {message && <p className="mt-3 text-sm text-neutral-600">{message}</p>}
    </section>
  );
}
