import type { Metadata } from "next";
import { getSiteRestaurant } from "@/lib/site/restaurant";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getSiteRestaurant();
  return { title: `Terms of Service — ${restaurant?.name ?? "Our Restaurant"}` };
}

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

export default async function TermsPage() {
  const restaurant = await getSiteRestaurant();
  const name = restaurant?.name ?? "Our Restaurant";

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--site-accent)" }}>
        Terms of Service
      </p>
      <h1 className="font-site-heading mt-2 text-3xl font-bold sm:text-4xl" style={{ color: "var(--site-primary)" }}>
        Using the {name} website
      </h1>
      <p className="mt-4 text-sm" style={{ color: "var(--site-muted)" }}>
        Last updated July 14, 2026.
      </p>

      <Section heading="What this site is for">
        <p>
          This website is here to help you find our hours, menu, location, and how to reach us. By using it, you
          agree to these terms.
        </p>
      </Section>

      <Section heading="Menu, pricing, and hours">
        <p>
          We do our best to keep our menu, prices, and hours accurate and up to date, but they can change without
          notice — a seasonal item may run out, a price may change, or we may close for a holiday. Please call
          ahead to confirm anything time-sensitive.
        </p>
        <p>
          Our Daily Specials image is generated with the help of AI from a photo of our own handwritten board and
          is reviewed by staff before it&apos;s posted, but food presentation may vary from the photo.
        </p>
      </Section>

      <Section heading="No online ordering or payments here">
        <p>
          This site doesn&apos;t process orders or take payment information. &quot;Order&quot; and &quot;Call to
          Order&quot; links connect you to us by phone — no payment card information is ever entered on this site.
        </p>
      </Section>

      <Section heading="Site content">
        <p>
          The text, photos, and branding on this site belong to {name} (or are used with permission) and are not
          for reuse elsewhere without asking us first.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          This site is provided as-is, without warranties of any kind, to the fullest extent the law allows. We
          aren&apos;t liable for any indirect or incidental damages arising from your use of it.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>These terms are governed by the laws of the State of Florida.</p>
      </Section>

      <Section heading="Changes">
        <p>We may update these terms as the site changes. Continued use of the site means you accept the current version.</p>
      </Section>

      <Section heading="Questions">
        <p>
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
