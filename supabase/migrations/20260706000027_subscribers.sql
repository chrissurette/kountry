-- Mailing-list capture: visitors leave an email and/or phone number from the
-- homepage subscribe form; the owner manages the list from /admin/subscribers
-- (view, manually add, bulk-delete, export emails to CSV). Deliberately its
-- own table rather than reusing restaurant_members or any existing contact
-- list — subscribers have no auth account and no relationship to the app
-- beyond being on this list.
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  email text,
  phone text,
  source text not null default 'homepage' check (source in ('homepage', 'manual')),
  created_at timestamptz not null default now(),
  constraint subscribers_email_or_phone check (email is not null or phone is not null)
);

create index subscribers_restaurant_id_idx on subscribers(restaurant_id);

-- Case-insensitive de-dupe per restaurant: resubmitting the same email (or
-- phone) from the homepage form shouldn't create a second row. Partial
-- indexes (not table-wide unique) since either column can be null.
create unique index subscribers_restaurant_email_idx on subscribers(restaurant_id, lower(email)) where email is not null;
create unique index subscribers_restaurant_phone_idx on subscribers(restaurant_id, phone) where phone is not null;

alter table subscribers enable row level security;

create policy subscribers_all_member on subscribers
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

-- No anon/public RLS policy: the homepage signup form has no user session, so
-- its insert goes through the service-role client (src/lib/supabase/admin.ts),
-- same pattern as the public menu read path — RLS is bypassed there by
-- design, not a gap.
