import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { lookupUnsubscribeToken } from "@/lib/subscribers/service";
import { UnsubscribeClient } from "./unsubscribe-client";

// Never cached and never indexed: the URL carries a per-person capability
// token, so it must not be stored by a CDN or turn up in search results.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale).unsubscribe;

  // Read-only lookup — loading this page must never opt anyone out. The
  // confirm button does that (see unsubscribe-client.tsx / the API route).
  const target = token ? await lookupUnsubscribeToken(token) : null;

  return (
    <main className="mx-auto max-w-lg px-5 py-24 text-center">
      {target ? (
        <UnsubscribeClient
          token={token!}
          maskedContact={target.maskedContact}
          alreadyUnsubscribed={target.alreadyUnsubscribed}
          locale={locale}
        />
      ) : (
        <>
          <h1 className="font-site-heading text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
            {t.invalidHeading}
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--site-muted)" }}>
            {t.invalidBody}
          </p>
          <p className="mt-8 text-sm">
            <Link href="/" className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>
              {t.backToSite}
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
