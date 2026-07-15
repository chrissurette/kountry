-- Uploaded menu photos, logos, style references, and generated exports.
-- Files themselves live in Supabase Storage private buckets; this table is the metadata row.
create table assets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  kind text not null check (kind in ('menu_photo', 'logo', 'style_ref', 'export')),
  storage_path text not null,
  mime text,
  width int,
  height int,
  content_hash text,          -- sha256 of file bytes; used to cache vision-parse results
  created_at timestamptz not null default now()
);

create index assets_restaurant_id_idx on assets(restaurant_id);
create index assets_content_hash_idx on assets(content_hash);

alter table assets enable row level security;

create policy assets_all_member on assets
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );
