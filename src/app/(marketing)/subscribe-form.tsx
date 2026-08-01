"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

type Status = "idle" | "submitting" | "success" | "error";
type FormError =
  | { kind: "validation" | "rateLimited" | "generic" }
  | { kind: "server"; message: string };

/**
 * Homepage mailing-list signup — email and/or phone, posts to
 * POST /api/public/{slug}/subscribe (src/lib/subscribers/service.ts). The
 * `company` field is a honeypot: hidden from real visitors via CSS + tabIndex
 * -1 + aria-hidden, but a bot that blindly fills every input on the page will
 * fill it too — the route silently no-ops on a non-empty value rather than
 * rejecting with an error, so as not to tip off anything sophisticated
 * enough to retry.
 */
export function SubscribeForm({ restaurantSlug, locale }: { restaurantSlug: string; locale: Locale }) {
  const t = getDictionary(locale).subscribe;
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<FormError | null>(null);

  const errorMessage =
    formError?.kind === "validation"
      ? t.validationError
      : formError?.kind === "rateLimited"
        ? t.rateLimited
        : formError?.kind === "generic"
          ? t.error
          : formError?.kind === "server"
            ? formError.message
            : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setStatus("error");
      setFormError({ kind: "validation" });
      return;
    }
    setStatus("submitting");
    setFormError(null);
    try {
      const res = await fetch(`/api/public/${restaurantSlug}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() || null, phone: phone.trim() || null, company }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        // 429 gets its own localized string — the server's message is
        // English-only (the established scope for API-origin errors), but
        // rate limiting is the one failure a real ES visitor could plausibly
        // hit, so the client maps the status itself.
        setFormError(
          res.status === 429
            ? { kind: "rateLimited" }
            : data?.error
              ? { kind: "server", message: data.error }
              : { kind: "generic" },
        );
        return;
      }
      // One outcome on purpose — the API no longer tells us (or anyone) whether
      // this address was already on the list, since that would be a membership
      // oracle on an open endpoint. See the subscribe route's note.
      setStatus("success");
      setEmail("");
      setPhone("");
    } catch {
      setStatus("error");
      setFormError({ kind: "generic" });
    }
  }

  if (status === "success") {
    return (
      <p className="text-center text-base font-semibold" style={{ color: "var(--site-primary)" }}>
        {t.success}
      </p>
    );
  }

  return (
    // max-w-3xl at md+, not a flat max-w-lg: at 512px the row had to fit two
    // fields plus the submit button, which squeezed each field to ~183px (EN)
    // / ~105px of inner text space (ES, whose button copy is ~215px) — narrow
    // enough that the phone placeholder was actually being truncated in both
    // languages. Widening the container is the real fix; the phone's own
    // max-w cap was never the binding constraint (measured live). 3xl and not
    // 2xl because ES's longest placeholder ("Número de teléfono (opcional)",
    // ~192px of text) still truncated by 7px at 2xl once its wider button
    // took its share — the section's own px-5 clamps this to the viewport on
    // a real 768px tablet anyway, so 3xl costs nothing there.
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg flex-col gap-3 md:max-w-3xl">
      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      {/* Row from md, not sm: at 640px the container is still max-w-lg and a
          three-across row can't fit the Spanish placeholders + button without
          truncating, so 640–767px stacks (full-width fields always fit) and
          only goes side-by-side once there's genuinely room. */}
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className="w-full rounded-full border px-4 py-2.5 text-sm focus:outline-none"
          style={{ borderColor: "var(--site-border)", background: "var(--site-surface)", color: "var(--site-text)" }}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.phonePlaceholder}
          // No max-w cap: an arbitrary 220px kept this field from using the
          // room the wider container now gives it, and its placeholder is the
          // longest of the two ("Número de teléfono (opcional)" needs ~192px
          // of text space alone). Both fields are w-full so flex splits the
          // row evenly between them.
          className="w-full rounded-full border px-4 py-2.5 text-sm focus:outline-none"
          style={{ borderColor: "var(--site-border)", background: "var(--site-surface)", color: "var(--site-text)" }}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: "var(--site-primary)" }}
        >
          {status === "submitting" ? t.submitting : t.submit}
        </button>
      </div>
      {status === "error" && errorMessage && (
        <p role="alert" className="text-center text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
