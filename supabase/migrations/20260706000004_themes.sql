-- Global theme catalog (docs/03): "seeded rows, not code". Themes are shared
-- design templates, not restaurant-owned data, so they carry no restaurant_id.
--
-- Deviation note from docs/03's literal preview_asset_id: theme previews are
-- static catalog images (seeded alongside the theme, not a per-restaurant
-- upload), so this stores a plain storage path/URL instead of an FK into the
-- restaurant-scoped assets table. Same intent (show a preview), simpler fit.
create table themes (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  preview_image_path text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table themes enable row level security;

-- Read-only shared catalog: any authenticated user may list themes.
create policy themes_select_authenticated on themes
  for select using (auth.role() = 'authenticated');

-- Inserts/updates/deletes happen via migrations/seed with the service role only.
