-- Fax/Email daily-special delivery list (2026-07-16, owner's call): the
-- /email-fax-list page now hosts a NATIVE form replicating the owner's
-- Microsoft Form ("Fax and Email Preference For Daily Special") and logs
-- every submission here, instead of linking out. One row per submission —
-- deliberately a LOG, not a deduped list (owner's explicit "log each entry");
-- the owner curates from /admin/email-fax-list, and the public endpoint is
-- rate-limited + honeypotted like the subscribe form.
--
-- Distinct from `subscribers` on purpose: that list is "email me news",
-- this one is "send me the daily special menu itself, by fax and/or email,
-- on these days" — different consent, different contact types (fax has no
-- column there), different processing (manual send by the owner).
--
-- These rows double as the CONSENT RECORD for faxing: the federal Junk Fax
-- Act (TCPA §227) allows fax ads only with the recipient's prior express
-- invitation/permission, and this form IS that permission. Deleting a row
-- deletes the proof — see docs/09 before adding any pruning here.
create table email_fax_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  -- Business/location name, or a first name for individuals (form Q1).
  business_name text not null,
  method text not null check (method in ('fax', 'email', 'both')),
  fax text,
  email text,
  -- Days the sender should include them on (form Q5); empty = unspecified,
  -- which the owner treats as "every day". Values constrained to day keys.
  days text[] not null default '{}' check (days <@ array['mon','tue','wed','thu','fri','sat','sun']),
  notes text,
  created_at timestamptz not null default now(),
  -- A method that names a channel must come with that channel's contact.
  constraint email_fax_requests_fax_present check (method not in ('fax', 'both') or fax is not null),
  constraint email_fax_requests_email_present check (method not in ('email', 'both') or email is not null)
);

create index email_fax_requests_restaurant_id_idx on email_fax_requests(restaurant_id);

alter table email_fax_requests enable row level security;

-- Owner-only, same as subscribers (migration ..029) and for the same reason:
-- customer PII gets DB-level defense in depth on top of the middleware role
-- gate. This is the second conscious use of that exception — it applies to
-- PII tables, not as a new default for everything (docs/03, docs/09).
create policy email_fax_requests_owner_only on email_fax_requests
  for all using (
    restaurant_id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  ) with check (
    restaurant_id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- No anon policy: the public form has no session; its insert goes through the
-- service-role client, same pattern as subscribers (migration ..027).
