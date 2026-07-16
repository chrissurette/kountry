import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  return { title: `Privacy Policy — ${restaurant?.name ?? "Our Restaurant"}` };
}

// THIS PAGE MAKES SPECIFIC FACTUAL CLAIMS ABOUT THE APP. It is product
// surface, not documentation — it goes stale silently and a stale privacy
// policy is itself a legal problem (docs/09's FDUTPA note). Treat any change
// to what the app collects, stores, sends, or sets in a browser as also a
// change to this file and to docs/09.
//
// An earlier version of this comment said "no customer-facing forms, no
// cookies outside the staff admin tool" and told the reader to update the
// copy "if ... a newsletter signup is ever added". All three of those went
// stale without anyone touching this page — the language toggle added a
// cookie (2026-07-15), the email-list signup added a customer-facing form
// (2026-07-16), and email+password auth (2026-07-14) falsified a "no password
// to store" claim below. Hence the louder warning.
//
// Accurate as of 2026-07-16, verified against source: no analytics/ad
// trackers or third-party scripts of any kind (zero such packages in
// package.json); one functional cookie (`site_locale`) set only on an
// explicit click; customer PII is limited to the optional email-list signup
// (email/phone → Supabase only) and the Email/Fax List daily-special request
// form (business/first name, fax/email, days, notes → email_fax_requests,
// AND a copy to Netlify Forms + its notification email — the one customer-PII
// flow that goes beyond Supabase, disclosed in both the Netlify bullet and
// the fax/email section below). Nothing customer-submitted is ever sent to
// OpenAI or any AI provider. All public form endpoints rate-limit on an
// HMAC-hashed connection address (never the raw IP, ≤1 day retention —
// src/lib/rate-limit.ts), and the retention stance ("nothing deleted
// automatically; erasure on request") is the written policy adopted
// 2026-07-16 (docs/09).
function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-site-heading text-xl font-semibold" style={{ color: "var(--site-primary)" }}>
        {heading}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed" style={{ color: "var(--site-text)" }}>
        {children}
      </div>
    </section>
  );
}

export default async function PrivacyPolicyPage() {
  const restaurant = await getSiteRestaurant();
  const name = restaurant?.name ?? "Our Restaurant";

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        Privacy Policy
      </p>
      <h1 className="font-site-heading mt-2 text-3xl font-bold sm:text-4xl" style={{ color: "var(--site-primary)" }}>
        How {name} handles information
      </h1>
      <p className="mt-4 text-sm" style={{ color: "var(--site-muted)" }}>
        Last updated July 16, 2026.
      </p>

      <Section heading="Visiting this website">
        <p>
          Browsing this website does not create any account, and we don&apos;t collect personal information from
          you just for visiting. This site uses no analytics or advertising trackers of any kind — nothing is set
          in your browser to identify or follow you, and nothing about your visit is shared with an advertiser or
          data broker.
        </p>
        <p>
          The one thing we do store in your browser is a small preference cookie, and only if you actively click
          the English/Español switch — it just remembers which language you picked. It contains nothing that
          identifies you and isn&apos;t used for tracking.
        </p>
        <p>
          Our web host (Netlify) and database provider (Supabase) may keep standard technical server logs — the
          kind every website generates automatically, like IP addresses and timestamps of requests — purely for
          keeping the site running and secure. We don&apos;t access or use those logs to identify visitors.
        </p>
      </Section>

      <Section heading="Contacting us">
        <p>
          If you call, email, or reach out about catering, we&apos;ll use whatever you share (like your phone
          number or event details) only to respond to you. We won&apos;t add you to our email list just because you
          contacted us — that only happens if you sign up for it yourself — and we don&apos;t share that
          information with anyone else.
        </p>
      </Section>

      <Section heading="Our email list">
        <p>
          If you enter your email address or phone number in the sign-up box on our homepage, we store it so we can
          let you know about daily specials, events, and news. That&apos;s the only reason we collect it. We
          don&apos;t sell it, rent it, or share it with anyone else, and we don&apos;t use it to track you.
        </p>
        <p>
          Signing up is entirely optional — nothing else on this site requires it. Every email we send includes an
          unsubscribe link that takes you off the list on the spot, no reply needed. You can also just contact us
          using the details below, whether to be removed or to ask what we have on file for you.
        </p>
        <p>
          When you unsubscribe we keep a record that you did, so that you don&apos;t get added back by mistake
          later. If you&apos;d rather we erase your details entirely, contact us and we&apos;ll delete them.
        </p>
        <p>
          We keep sign-up details for as long as we run the list — nothing is deleted automatically on a timer.
          Getting off the list is the unsubscribe link; getting your details erased entirely is a request to us,
          and we honor both.
        </p>
        <p>
          To protect the forms on this site from abuse, our server briefly counts recent submissions per
          connection using a scrambled (one-way hashed) version of the connection&apos;s network address. The
          address itself is never stored, the count can&apos;t be traced back to you, and it&apos;s deleted within
          a day.
        </p>
      </Section>

      <Section heading="The daily special, by fax or email">
        <p>
          Separately from the email list above, our Email/Fax List page lets a business or an individual ask to
          have each day&apos;s specials menu sent to them by fax, email, or both. If you fill it out, we store what
          you give us — a business or first name, a fax number and/or email address, which days you want it, and
          any note you add — and we use it only to send you that menu. We don&apos;t sell it or use it for anything
          else. Our website host (Netlify) also keeps a copy of your submission and emails it to us so we see your
          request right away — that&apos;s part of running the site, not sharing your details with anyone for their
          own use.
        </p>
        <p>
          To change your days, your contact details, or to stop receiving it altogether, just contact us — call,
          or reply to any menu we send — and we&apos;ll update or remove your entry. We keep your request on file
          while we&apos;re sending to you; it&apos;s also our record that you asked us to.
        </p>
      </Section>

      <Section heading="Our Daily Specials photo, and AI">
        <p>
          Each day&apos;s specials board is handwritten in the restaurant, then our staff photograph it and use an
          AI tool to read the handwriting into a list of dishes and prices, which our staff check and correct. The
          clean version you see is then drawn by our own software from that corrected list. We also use an AI tool
          to translate our menu text into Spanish, which our staff review before it goes up. Both processes use our
          own board and our own menu wording — they do not involve any information about you as a visitor, and you
          never submit anything to them.
        </p>
      </Section>

      <Section heading="Staff accounts">
        <p>
          Team members with access to our admin tools sign in with a username or email address and a password.
          Passwords are handled by our database provider (Supabase) and stored only in a securely hashed form —
          we can&apos;t read them. Staff sign-in details, and the photos/menu content staff upload, are kept with
          that same provider and processed as described above. Access is limited to authorized staff.
        </p>
      </Section>

      <Section heading="Who we work with">
        <p>These providers help us run this site and don&apos;t receive anything beyond what&apos;s needed to do that job:</p>
        <ul className="list-disc pl-5">
          <li><strong>Supabase</strong> — our database, staff sign-in, photo storage, and our email list.</li>
          <li>
            <strong>Netlify</strong> — website hosting. When you send us a daily-special request from the
            Email/Fax List page, Netlify also holds a copy of that submission and emails it to us, so we see your
            request right away.
          </li>
          <li>
            <strong>OpenAI</strong> — reads our staff&apos;s photo of the handwritten specials board into a list of
            dishes and prices, and translates our menu text into Spanish. It never receives your email address,
            phone number, or anything else you give us.
          </li>
        </ul>
      </Section>

      <Section heading="Security">
        <p>
          Any provider credentials we use are encrypted and only ever decrypted on our server, never exposed to a
          browser or written to a log. Access to our admin tools is restricted to authorized staff.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If what we collect or how we use it ever changes — for example, if we add online ordering — we&apos;ll
          update this page to describe it.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          {restaurant?.phone || restaurant?.email
            ? "Reach out any time: "
            : "Reach out any time using the contact information on our "}
          {restaurant?.phone && <a href={`tel:${restaurant.phone}`} className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>{restaurant.phone}</a>}
          {restaurant?.phone && restaurant?.email && " or "}
          {restaurant?.email && <a href={`mailto:${restaurant.email}`} className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>{restaurant.email}</a>}
          {!restaurant?.phone && !restaurant?.email && (
            <a href="/visit" className="font-semibold hover:underline" style={{ color: "var(--site-accent)" }}>Visit page</a>
          )}
          .
        </p>
      </Section>
    </main>
  );
}
