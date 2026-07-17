-- Meta (Facebook Page + Instagram Business) auto-publishing — the
-- `publish_targets` seam docs/07 reserved from the start, now real. Full
-- design + the Graph API research behind it: docs/10-meta-publishing.md.
--
-- One row per destination, not per connection: a single Meta connect creates
-- a facebook_page row and (if IG is linked to that Page) an
-- instagram_business row. That keeps the post-publish hook exactly the loop
-- docs/07 promised — "iterate enabled targets" — lets the owner pause one
-- channel without disconnecting the other, and makes a future non-Meta
-- destination (Google Business, X) another `kind` rather than another table.
create table publish_targets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  kind text not null check (kind in ('facebook_page', 'instagram_business')),
  enabled boolean not null default true,
  -- Both kinds anchor on the Facebook Page: IG publishing uses the PAGE
  -- access token, not an Instagram-specific one (docs/10).
  page_id text not null,
  ig_user_id text,                         -- instagram_business only
  display_name text not null,              -- "Kountry Kitchen" / "@kountrykitchen" — what Settings shows
  -- The long-lived PAGE access token, AES-256-GCM via src/lib/providers/
  -- crypto.ts, stored as base64 text (same pattern and reasoning as
  -- provider_credentials.encrypted_key — PostgREST serializes bytea
  -- ambiguously). NEVER selected into a client-facing response: the service
  -- layer's column allowlist omits it, same discipline as SubscriberListItem
  -- and the provider PUBLIC_COLUMNS allowlist.
  encrypted_access_token text not null,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- One target of each kind per restaurant: reconnecting updates in place
  -- rather than accumulating stale duplicate tokens.
  constraint publish_targets_one_per_kind unique (restaurant_id, kind),
  -- An instagram_business target is meaningless without the IG user id.
  constraint publish_targets_ig_id_present check (kind <> 'instagram_business' or ig_user_id is not null)
);

create index publish_targets_restaurant_id_idx on publish_targets(restaurant_id);

alter table publish_targets enable row level security;

-- Owner-only — the same deliberate exception as subscribers (..029) and
-- email_fax_requests (..031), and the strongest case for it yet: this table
-- holds a live credential that can post publicly as the restaurant. An
-- employee has no route to it (middleware) and now no DB access either.
create policy publish_targets_owner_only on publish_targets
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

-- Append-only log of every crosspost attempt. This is what makes a
-- best-effort hook honest: posting never blocks a publish (docs/10), so a
-- failure has to surface SOMEWHERE — it surfaces here, and in Settings.
-- Also the audit trail for "did the special actually go to Facebook today?".
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  -- Keep the log if a target is later disconnected: history of what was
  -- posted shouldn't evaporate with the connection.
  target_id uuid references publish_targets(id) on delete set null,
  snapshot_id uuid references published_snapshots(id) on delete cascade,
  kind text not null check (kind in ('facebook_page', 'instagram_business')),
  status text not null check (status in ('posted', 'failed')),
  external_post_id text,                   -- FB post id / IG media id, when posted
  error text,                              -- Graph error message, when failed
  created_at timestamptz not null default now()
);

create index social_posts_restaurant_created_idx on social_posts(restaurant_id, created_at desc);

alter table social_posts enable row level security;

create policy social_posts_owner_only on social_posts
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

-- Social-ready JPEG renders of the Daily Special. Instagram accepts JPEG
-- only, from a public URL, at an aspect ratio between 4:5 and 1.91:1 — our
-- SVG qualifies on none of those counts, and a long board breaks the ratio
-- (docs/10). Both are composed in the BROWSER at "Save & render" time (the
-- proven camera-roll rasterization path — Netlify functions have no system
-- fonts, and the SVG deliberately uses them, so a server render would post
-- something the owner never previewed).
--   social_image_path    — natural-ratio JPEG for Facebook (no ratio limit)
--   social_image_ig_path — 1080x1350 (4:5) padded JPEG for Instagram
-- Nullable: drafts rendered before this feature, and any render from a
-- browser that failed to compose, simply have no social images — the hook
-- skips those targets rather than posting something wrong.
alter table menus add column social_image_path text;
alter table menus add column social_image_ig_path text;
