# 09 — Compliance Posture (Florida)

Written 2026-07-15 after a source-code compliance audit. This is an internal reference for how this app's data practices line up with Florida law and reasonable baseline practice — **not legal advice**; have a Florida-licensed attorney review before treating anything here as final, especially the public `/privacy` and `/terms` pages this doc supports.

## Why exposure is low today

The public marketing site collects essentially no visitor data: `src/proxy.ts`'s matcher excludes every marketing route from the session middleware, there are no analytics/ad-tracking dependencies anywhere in the codebase, and Catering/Order are plain `tel:`/`mailto:` links rather than forms that submit anything to a server. The only two `<form>` elements in the entire app (`src/app/login/page.tsx`, `src/app/admin/settings/settings-form.tsx`) are both staff-only and authenticated.

**Update (2026-07-15):** an anonymous visit is no longer strictly zero-cookie — the language toggle (docs/06) writes a single `site_locale` cookie (`en`/`es`), but only when a visitor actively clicks it, never on page load. It carries no identifying data, isn't used for tracking or analytics, and is a functional/preference cookie of the kind generally exempt from consent-banner requirements under both FIPA and the CalOPPA-driven `/privacy` posture below — but it does mean the literal "zero cookies" statement is now "zero cookies unless the visitor opts into a language preference." Not treated as a posture change; noted here for accuracy.

## Applicable law

- **Florida Information Protection Act, Fla. Stat. §501.171 ("FIPA")** — applies. Any business that acquires or stores Florida residents' personal information is a "covered entity"; the owner's own Supabase Auth login email qualifies. Requires reasonable security measures, breach notification within 30 days for incidents affecting 500+ Florida residents (to those residents *and* the Florida Attorney General), and secure disposal of personal information no longer needed.
- **Florida Digital Bill of Rights, Fla. Stat. §501.701 et seq. ("FDBR")** — does **not** apply. Florida's comprehensive consumer-privacy law is scoped to entities with $1B+ global gross annual revenue meeting additional data-volume/ad-revenue tests — far beyond a single-location restaurant. **Re-check this if the business ever becomes a multi-location group or franchise** (see "Re-check triggers" below).
- **CalOPPA** (California, but nationally-reaching in practice) — any commercial website reachable by California residents that collects personal information should post a privacy policy. Addressed by `/privacy`.
- **FDUTPA, Fla. Stat. §501.201** — general unfair/deceptive-practices backstop. No violation found; the main implication is that `/privacy` and `/terms` must stay accurate as the app changes, since an inaccurate policy is itself a deceptive-practice risk.
- **ADA Title III / WCAG** — not a Florida statute, but Florida (11th Circuit) sees a high volume of website-accessibility demand letters against small businesses and restaurants specifically. *Gil v. Winn-Dixie* (11th Cir. 2021) narrowed what counts as a covered "place of public accommodation" online, but that's no defense against a demand letter arriving in the first place. A WCAG 2.1 AA pass is worth doing on that basis alone.
- **Florida mini-TCPA, Fla. Stat. §501.059** — not triggered; no SMS or robocall marketing exists today. Revisit only if order-ready texts or SMS marketing are ever added.
- **PCI-DSS, COPPA** — not applicable; no payment processing, no children-directed features.

## The OpenAI data flow, reconsidered

Daily Specials photos (of the restaurant's own handwritten board) are sent to OpenAI's `gpt-image-1` API to generate a styled image (`src/lib/menu/generate-image-service.ts`). Worth being precise about *whose* data this is: a customer never submits anything to this pipeline and never interacts with OpenAI in any way — they only ever see the finished image. The photographed subject is a board, not a person, in the normal case. So this isn't really a "customer personal information disclosed to a third party" situation the way a privacy policy usually means that phrase.

It's disclosed in `/privacy` anyway, for three narrower reasons: (1) if a specials-board photo ever incidentally includes a person in frame, that person's image *would* be processed by OpenAI, and the policy already covers that case without needing an update; (2) completeness — a privacy policy listing subprocessors is a normal expectation even when a specific flow is low-risk; (3) it's honest, which matters more for FDUTPA-style accuracy than for any specific disclosure mandate. The disclosure is deliberately light-touch (one paragraph, no subprocessor-agreement detail) to match the actual risk level — this is not being treated as a high-severity finding.

## Breach notification procedure

If a security incident is discovered that may have exposed personal information (staff login data, provider API keys, uploaded photos):

1. Rotate any potentially-exposed credentials immediately (Supabase service role key, AI provider keys, `CRON_SECRET`) via the Supabase dashboard / provider consoles.
2. Determine scope: how many Florida residents' personal information was involved, and what categories (FIPA's notice trigger is 500+ affected Florida residents).
3. If 500+ Florida residents are affected: notify each affected individual and the Florida Attorney General's office within **30 days** of discovery (FIPA allows a limited extension for law-enforcement investigation delays). If 1,000+ are affected, also notify nationwide consumer reporting agencies.
4. Document what happened, what was exposed, and what was done — both for the notice itself and for future reference.

Given this app's current single-tenant blast radius (one restaurant, one owner account), a realistic incident here is small-scale, but the 30-day clock starts at *discovery*, not at confirmation — err toward starting this process early.

## Data retention & disposal

- Uploaded photos (Daily Specials source photos, generated images, hero/gallery/menu-item images) and the account they belong to are deleted together if a restaurant's account is closed — there's no indefinite retention of a closed account's Storage objects or database rows once cleanup runs.
- Provider API keys are stored encrypted (Supabase Vault) and are deleted, not merely deactivated, when a key is removed in Settings.
- This satisfies FIPA's "secure disposal" expectation at the level this app currently operates — single-tenant, owner-managed. Revisit if/when multi-tenant self-serve signup ships (docs/07), since that introduces an actual account-closure flow that needs to trigger this cleanup automatically rather than by hand.

## Re-check triggers

Reassess this document (and FDBR applicability specifically) if any of the following happen:

- The business expands to multiple locations or joins a franchise/corporate group.
- Online ordering, SMS marketing, or any customer-facing form/account system is added — each is a new personal-information-collection surface that needs its own line in `/privacy`.
- Analytics, advertising, or any third-party tracking script is ever added — at that point, and not before, a cookie-consent mechanism becomes relevant.
- A security incident occurs — follow the procedure above regardless of scale.
