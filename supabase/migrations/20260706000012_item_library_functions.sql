-- Trigram-ranked fuzzy suggest (docs/03: "learns recurring items and prices
-- to auto-correct/auto-suggest during OCR review"). Plain ilike wouldn't use
-- the search_text GIN trgm index or rank by similarity, so this is an RPC
-- rather than a plain supabase-js filter.
create or replace function suggest_item_library(p_restaurant_id uuid, p_query text, p_limit int default 5)
returns table (
  id uuid,
  canonical_name text,
  last_price_cents int,
  default_description text,
  section_hint text,
  times_seen int,
  similarity real
)
language sql
security invoker
stable
as $$
  select
    il.id,
    il.canonical_name,
    il.last_price_cents,
    il.default_description,
    il.section_hint,
    il.times_seen,
    similarity(il.search_text, lower(p_query)) as similarity
  from item_library il
  where il.restaurant_id = p_restaurant_id
    and il.search_text % lower(p_query)
  order by similarity desc, il.times_seen desc
  limit p_limit;
$$;

-- Learns recurring items/prices from a saved menu (called after the Review
-- screen's save — docs/06's "learned item library"). Fuzzy-matches each
-- item against existing library entries (similarity > 0.6); updates
-- times_seen/last_price_cents/price_history on a match, adds the item's
-- name as an alias if it differs from the canonical spelling, or inserts a
-- new entry otherwise. One call per save, looping over all items —
-- mirrors replace_menu_content's jsonb-array-loop shape.
create or replace function learn_items_from_menu(p_restaurant_id uuid, p_sections jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_section jsonb;
  v_item jsonb;
  v_name text;
  v_price_cents int;
  v_description text;
  v_section_name text;
  v_existing_id uuid;
  v_existing_canonical text;
  v_existing_aliases text[];
begin
  for v_section in select * from jsonb_array_elements(p_sections)
  loop
    v_section_name := v_section->>'name';
    for v_item in select * from jsonb_array_elements(coalesce(v_section->'items', '[]'::jsonb))
    loop
      v_name := v_item->>'name';
      if v_name is null or length(trim(v_name)) = 0 then
        continue;
      end if;
      v_price_cents := nullif(v_item->>'price_cents', '')::int;
      v_description := v_item->>'description';

      select id, canonical_name, aliases into v_existing_id, v_existing_canonical, v_existing_aliases
      from item_library
      where restaurant_id = p_restaurant_id
        and similarity(canonical_name, v_name) > 0.6
      order by similarity(canonical_name, v_name) desc
      limit 1;

      if v_existing_id is not null then
        update item_library set
          times_seen = times_seen + 1,
          last_seen_at = now(),
          last_price_cents = coalesce(v_price_cents, last_price_cents),
          price_history = case
            when v_price_cents is not null then price_history || jsonb_build_object('price_cents', v_price_cents, 'seen_at', now())
            else price_history
          end,
          default_description = coalesce(default_description, v_description),
          section_hint = coalesce(section_hint, v_section_name),
          aliases = case
            when v_name <> v_existing_canonical and not (v_name = any(v_existing_aliases))
              then v_existing_aliases || v_name
            else v_existing_aliases
          end
        where id = v_existing_id;
      else
        insert into item_library (
          restaurant_id, canonical_name, aliases, last_price_cents, price_history,
          default_description, section_hint, times_seen, last_seen_at
        ) values (
          p_restaurant_id,
          v_name,
          '{}',
          v_price_cents,
          case when v_price_cents is not null
            then jsonb_build_array(jsonb_build_object('price_cents', v_price_cents, 'seen_at', now()))
            else '[]'::jsonb
          end,
          v_description,
          v_section_name,
          1,
          now()
        );
      end if;
    end loop;
  end loop;
end;
$$;
