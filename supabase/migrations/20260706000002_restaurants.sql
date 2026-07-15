-- The restaurant profile record. This is THE multi-tenant seam (docs/03-data-model.md):
-- adding a restaurant means inserting a row here, never changing code. Nothing
-- restaurant-specific may be hardcoded elsewhere in the app.
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                 -- public API key, e.g. /api/public/{slug}/menu
  name text not null,
  address text,
  phone text,
  email text,
  hours jsonb not null default '[]'::jsonb,          -- [{day, open, close}, ...]
  social jsonb not null default '{}'::jsonb,          -- {instagram, facebook, ...}
  brand jsonb not null default '{}'::jsonb,           -- {logo_asset_id, colors:{...}, fonts:{...}}
  menu_defaults jsonb not null default '{}'::jsonb,   -- {currency, tax_note, disclaimer, section_order[]}
  live_snapshot_id uuid,                     -- FK to published_snapshots added in a later migration
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger restaurants_set_updated_at
  before update on restaurants
  for each row execute function set_updated_at();

-- restaurant_members: single-owner today, the seam for multi-tenant accounts later.
create table restaurant_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index restaurant_members_restaurant_id_idx on restaurant_members(restaurant_id);

alter table restaurants enable row level security;
alter table restaurant_members enable row level security;

-- Members can see and edit only the restaurant(s) they belong to.
create policy restaurants_select_member on restaurants
  for select using (
    id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

create policy restaurants_update_member on restaurants
  for update using (
    id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

-- Restaurant creation and membership management happen via a server-side
-- service-role bootstrap (see supabase/seed and docs/07 Phase 0 notes), not
-- direct client inserts. Single-owner onboarding is a one-time manual step
-- until self-serve multi-tenant signup is built.
create policy restaurant_members_select_self on restaurant_members
  for select using (user_id = auth.uid());
