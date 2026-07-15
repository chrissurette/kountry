import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  return { title: `Privacy Policy — ${restaurant?.name ?? "Our Restaurant"}` };
}

// Reflects actual current practice (2026-07): no visitor tracking, no
// customer-facing forms, no cookies outside the staff admin tool. Update this
// copy if that ever changes — e.g. if analytics, an online-ordering form, or
// a newsletter signup is ever added, since each of those would need its own
// disclosure here.
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
        Last updated July 14, 2026.
      </p>

      <Section heading="Visiting this website">
        <p>
          Browsing this website does not create any account, and we don&apos;t collect personal information from
          you just for visiting. This site does not use cookies, analytics, or advertising trackers of any kind —
          nothing is set in your browser to identify or follow you, and nothing about your visit is shared with an
          advertiser or data broker.
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
          number or event details) only to respond to you. We don&apos;t add you to a mailing list or share that
          information with anyone else.
        </p>
      </Section>

      <Section heading="Our Daily Specials photo, and AI">
        <p>
          Each day&apos;s specials board is handwritten in the restaurant, then our staff photograph it and use an
          AI image-generation tool to produce a styled version for this website and our menu display. That process
          uses a photo of our own board — it does not involve any information about you as a visitor, and you never
          submit anything to it.
        </p>
      </Section>

      <Section heading="Staff accounts">
        <p>
          Team members with access to our admin tools sign in with their email address only — there&apos;s no
          password to store. That email, and the photos/menu content staff upload, are kept in our database
          provider (Supabase) and processed as described above. Access is limited to authorized staff.
        </p>
      </Section>

      <Section heading="Who we work with">
        <p>These providers help us run this site and don&apos;t receive anything beyond what&apos;s needed to do that job:</p>
        <ul className="list-disc pl-5">
          <li><strong>Supabase</strong> — our database, staff sign-in, and photo storage.</li>
          <li><strong>Netlify</strong> — website hosting.</li>
          <li><strong>OpenAI</strong> — generates the styled Daily Specials image from our staff&apos;s photo of the specials board.</li>
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
          If what we collect or how we use it ever changes — for example, if we add online ordering or an email
          list — we&apos;ll update this page to describe it before that feature goes live.
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
