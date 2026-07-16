"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

type Status = "confirm" | "working" | "done" | "error";

/**
 * The confirm step of an unsubscribe link. The opt-out only happens on this
 * button (POST) — never on page load — because mail scanners and link
 * prefetchers GET every URL in a message and would otherwise unsubscribe
 * people who never clicked (see the API route's note).
 */
export function UnsubscribeClient({
  token,
  maskedContact,
  alreadyUnsubscribed,
  locale,
}: {
  token: string;
  maskedContact: string;
  alreadyUnsubscribed: boolean;
  locale: Locale;
}) {
  const t = getDictionary(locale).unsubscribe;
  const [status, setStatus] = useState<Status>(alreadyUnsubscribed ? "done" : "confirm");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUnsubscribe() {
    setStatus("working");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus("error");
        // 429 → localized string (same reasoning as the subscribe form): the
        // one server-origin failure a real visitor could hit gets a message
        // in their own language, and it still points at the contact-us
        // fallback so a rate-limited opt-out always has a path off the list.
        setErrorMessage(res.status === 429 ? t.rateLimited : (data?.error ?? t.error));
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMessage(t.error);
    }
  }

  if (status === "done") {
    const heading = alreadyUnsubscribed ? t.alreadyHeading : t.doneHeading;
    const body = alreadyUnsubscribed ? t.alreadyBody(maskedContact) : t.doneBody(maskedContact);
    return (
      <>
        <h1 className="font-site-heading text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
          {heading}
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--site-muted)" }}>
          {body}
        </p>
        <BackLink label={t.backToSite} />
      </>
    );
  }

  return (
    <>
      <h1 className="font-site-heading text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
        {t.heading}
      </h1>
      <p className="mt-3 text-sm" style={{ color: "var(--site-muted)" }}>
        {t.confirmBody(maskedContact)}
      </p>
      <button
        type="button"
        onClick={handleUnsubscribe}
        disabled={status === "working"}
        className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--site-primary)" }}
      >
        {status === "working" ? t.working : t.confirmButton}
      </button>
      {status === "error" && errorMessage && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <BackLink label={t.backToSite} />
    </>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <p className="mt-8 text-sm">
      <Link href="/" className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
        {label}
      </Link>
    </p>
  );
}
