-- AI provider layer (docs/05-provider-abstraction.md): owner-supplied keys,
-- per-task model selection, and usage metering.
--
-- SECURITY: encrypted_key is ciphertext (AES-256-GCM with a server-only
-- master key, see src/lib/providers/crypto.ts), stored as base64 TEXT rather
-- than bytea — PostgREST/Supabase serializes bytea as an ambiguous hex-escaped
-- string, which makes exact byte round-tripping fragile; base64 text avoids
-- that entirely. RLS allows the owner to SELECT their own row so API routes
-- can list/manage credentials, but the API response serializer must NEVER
-- include encrypted_key in a JSON response — only provider, key_last4, and
-- status are ever returned to the client. Decryption happens only inside
-- the provider registry (src/lib/providers/registry.ts), per request, never logged.
create table provider_credentials (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'openai', 'xai')),
  encrypted_key text not null,
  key_last4 text,
  status text not null default 'active' check (status in ('active', 'invalid')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

alter table provider_credentials enable row level security;

create policy provider_credentials_all_member on provider_credentials
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

create table provider_task_config (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  task text not null check (task in ('ocr_parse', 'copywriting', 'image_gen')),
  provider text not null check (provider in ('gemini', 'openai', 'xai')),
  model text not null,
  primary key (restaurant_id, task)
);

alter table provider_task_config enable row level security;

create policy provider_task_config_all_member on provider_task_config
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

create table provider_usage (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  provider text not null,
  model text not null,
  task text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  image_count int not null default 0,
  est_cost_usd numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);

create index provider_usage_restaurant_created_idx on provider_usage(restaurant_id, created_at desc);

alter table provider_usage enable row level security;

-- Usage rows are written by server-side code (service role) right after a
-- provider call; owners only need read access for the Settings dashboard.
create policy provider_usage_select_member on provider_usage
  for select using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );
