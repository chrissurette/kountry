"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DAY_KEYS, DELIVERY_METHODS, type DayKey, type DeliveryMethod } from "@/lib/email-fax/schema";

type Status = "idle" | "submitting" | "success" | "error";

const inputStyle = {
  borderColor: "var(--site-border)",
  background: "var(--site-surface)",
  color: "var(--site-text)",
} as const;

/**
 * Native replication of the owner's Microsoft Form ("Fax and Email Preference
 * For Daily Special") — same six questions, posting to our own
 * POST /api/public/{slug}/email-fax-list instead of Microsoft (owner's pivot,
 * 2026-07-16). `website` is the honeypot — deliberately NOT `company` (the
 * subscribe form's name for it) because this form has a real business-name
 * field; see the route's note.
 *
 * The fax/email inputs appear once a method that needs them is chosen —
 * whatever was typed is kept (not cleared) when the method changes, but the
 * service only persists the fields the final method uses.
 */
export function EmailFaxForm({ restaurantSlug, locale }: { restaurantSlug: string; locale: Locale }) {
  const t = getDictionary(locale).emailFax;
  const dayNames = getDictionary(locale).common.days;

  const [businessName, setBusinessName] = useState("");
  const [method, setMethod] = useState<DeliveryMethod | null>(null);
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<Set<DayKey>>(new Set());
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wantsFax = method === "fax" || method === "both";
  const wantsEmail = method === "email" || method === "both";

  const methodLabel: Record<DeliveryMethod, string> = {
    fax: t.methodFax,
    email: t.methodEmail,
    both: t.methodBoth,
  };

  function toggleDay(day: DayKey) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!businessName.trim()) return fail(t.nameRequired);
    if (!method) return fail(t.methodRequired);
    if (wantsFax && !fax.trim()) return fail(t.faxRequired);
    if (wantsEmail && !email.trim()) return fail(t.emailRequired);

    setStatus("submitting");
    try {
      const res = await fetch(`/api/public/${restaurantSlug}/email-fax-list`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          method,
          fax: wantsFax ? fax.trim() : null,
          email: wantsEmail ? email.trim() : null,
          // DAY_KEYS order, not insertion order, so "Wed, Mon" never happens.
          days: DAY_KEYS.filter((d) => days.has(d)),
          notes: notes.trim() || null,
          website,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(res.status === 429 ? t.rateLimited : t.error);
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(t.error);
    }
  }

  function fail(message: string) {
    setStatus("error");
    setErrorMessage(message);
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <h2 className="font-site-heading text-2xl font-semibold" style={{ color: "var(--site-primary)" }}>
          {t.successHeading}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--site-muted)" }}>
          {t.successBody}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--site-text)" }}>
        {t.nameLabel}
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          maxLength={200}
          className="rounded-xl border px-4 py-2.5 text-sm font-normal focus:outline-none"
          style={inputStyle}
        />
        <span className="text-xs font-normal" style={{ color: "var(--site-muted)" }}>
          {t.nameHint}
        </span>
      </label>

      <fieldset>
        <legend className="text-sm font-medium" style={{ color: "var(--site-text)" }}>
          {t.methodLabel}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DELIVERY_METHODS.map((m) => (
            <label
              key={m}
              className="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: method === m ? "var(--site-primary)" : "var(--site-border)",
                background: method === m ? "var(--site-primary)" : "var(--site-surface)",
                color: method === m ? "#fff" : "var(--site-text)",
              }}
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                className="sr-only"
              />
              {methodLabel[m]}
            </label>
          ))}
        </div>
      </fieldset>

      {wantsFax && (
        <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--site-text)" }}>
          {t.faxLabel}
          <input
            type="tel"
            value={fax}
            onChange={(e) => setFax(e.target.value)}
            maxLength={20}
            className="rounded-xl border px-4 py-2.5 text-sm font-normal focus:outline-none"
            style={inputStyle}
          />
        </label>
      )}

      {wantsEmail && (
        <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--site-text)" }}>
          {t.emailLabel}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={320}
            className="rounded-xl border px-4 py-2.5 text-sm font-normal focus:outline-none"
            style={inputStyle}
          />
        </label>
      )}

      <fieldset>
        <legend className="text-sm font-medium" style={{ color: "var(--site-text)" }}>
          {t.daysLabel}
        </legend>
        <p className="mt-1 text-xs" style={{ color: "var(--site-muted)" }}>
          {t.daysHint}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAY_KEYS.map((d) => (
            <label
              key={d}
              className="cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors"
              style={{
                borderColor: days.has(d) ? "var(--site-primary)" : "var(--site-border)",
                background: days.has(d) ? "var(--site-primary)" : "var(--site-surface)",
                color: days.has(d) ? "#fff" : "var(--site-text)",
              }}
            >
              <input type="checkbox" checked={days.has(d)} onChange={() => toggleDay(d)} className="sr-only" />
              {dayNames[d]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--site-text)" }}>
        {t.notesLabel}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          className="rounded-xl border px-4 py-2.5 text-sm font-normal focus:outline-none"
          style={inputStyle}
        />
      </label>

      {status === "error" && errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full px-8 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: "var(--site-primary)" }}
        >
          {status === "submitting" ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
