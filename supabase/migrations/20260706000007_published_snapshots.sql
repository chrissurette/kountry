-- Immutable publish snapshots: the unit of publishing, history, and one-tap
-- re-publish (docs/02-architecture.md). A snapshot fully resolves menu + profile
-- + brand + theme into one self-contained payload so it renders identically
-- forever, even after later profile/theme edits.
create table published_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_id uuid references menus(id) on delete set null,
  payload jsonb not null,
  theme_id uuid references themes(id),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id)
);

create index published_snapshots_restaurant_id_idx on published_snapshots(restaurant_id, published_at desc);

alter table published_snapshots enable row level security;

-- Owners can view their own publish history. The public-facing read path
-- (GET /api/public/{slug}/menu) never queries this table with the anon/user
-- client — it resolves restaurants.live_snapshot_id via the server-side
-- service-role client, so no anonymous RLS policy is added here.
create policy published_snapshots_select_member on published_snapshots
  for select using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

create policy published_snapshots_insert_member on published_snapshots
  for insert with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

-- Now that published_snapshots exists, wire up the deferred FK from restaurants.
alter table restaurants
  add constraint restaurants_live_snapshot_id_fkey
  foreign key (live_snapshot_id) references published_snapshots(id) on delete set null;
