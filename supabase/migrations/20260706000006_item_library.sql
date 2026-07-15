-- The learning layer: recurring items and prices, used to auto-correct/auto-suggest
-- during OCR review (docs/03, docs/06). Fuzzy matching via pg_trgm on a generated
-- search_text column (canonical_name + aliases) since trigram indexes need text,
-- not text[].

-- array_to_string() is cataloged STABLE (not IMMUTABLE) because it's polymorphic
-- over anyarray, even though the concrete text[] case is fully deterministic —
-- Postgres generated columns require IMMUTABLE, so this thin wrapper pins the
-- element type to text and re-declares it immutable.
create function text_array_to_string(text[], text) returns text
language sql immutable strict as $$
  select array_to_string($1, $2)
$$;

create table item_library (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  canonical_name text not null,
  aliases text[] not null default '{}',
  last_price_cents int,
  price_history jsonb not null default '[]'::jsonb,   -- [{price_cents, seen_at}]
  default_description text,
  section_hint text,
  times_seen int not null default 0,
  last_seen_at timestamptz,
  search_text text generated always as (
    lower(canonical_name || ' ' || text_array_to_string(aliases, ' '))
  ) stored
);

create index item_library_restaurant_id_idx on item_library(restaurant_id);
create index item_library_search_text_trgm_idx on item_library using gin (search_text gin_trgm_ops);

alter table item_library enable row level security;

create policy item_library_all_member on item_library
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

-- Now that item_library exists, wire up the deferred FK from menu_items.
alter table menu_items
  add constraint menu_items_library_item_id_fkey
  foreign key (library_item_id) references item_library(id) on delete set null;
