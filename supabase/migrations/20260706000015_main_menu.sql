-- The permanent Main Menu — separate from `menus` (which is now scoped to
-- Daily Specials: photo capture → AI parse → review → publish). The Main
-- Menu is hand-typed by staff, always live, no draft/publish/snapshot
-- lifecycle — same "direct edit, immediately live" model as the restaurant
-- profile itself, since it changes rarely. Tied straight to restaurant_id,
-- not to a `menus` row.
create table main_menu_sections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table main_menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  section_id uuid not null references main_menu_sections(id) on delete cascade,
  name text not null,
  description text,
  price_cents int,             -- integer cents always; never store floats
  price_note text,             -- escape hatch: "market price", "seasonal"
  sort_order int not null default 0
);

create index main_menu_sections_restaurant_id_idx on main_menu_sections(restaurant_id);
create index main_menu_items_restaurant_id_idx on main_menu_items(restaurant_id);
create index main_menu_items_section_id_idx on main_menu_items(section_id);

alter table main_menu_sections enable row level security;
alter table main_menu_items enable row level security;

create policy main_menu_sections_all_member on main_menu_sections
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

create policy main_menu_items_all_member on main_menu_items
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

-- Atomic bulk replace, same "one RPC call = one transaction" pattern as
-- replace_menu_content() (PostgREST/supabase-js has no client transaction).
-- p_sections shape: [{ "name": text, "items": [
--   { "name": text, "description": text|null, "price_cents": int|null, "price_note": text|null }
-- ]}]
create or replace function replace_main_menu(p_restaurant_id uuid, p_sections jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_section jsonb;
  v_item jsonb;
  v_section_id uuid;
  v_section_order int := 0;
  v_item_order int;
begin
  delete from main_menu_sections where restaurant_id = p_restaurant_id;

  for v_section in select * from jsonb_array_elements(p_sections)
  loop
    insert into main_menu_sections (restaurant_id, name, sort_order)
    values (p_restaurant_id, v_section->>'name', v_section_order)
    returning id into v_section_id;

    v_item_order := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_section->'items', '[]'::jsonb))
    loop
      insert into main_menu_items (
        restaurant_id, section_id, name, description, price_cents, price_note, sort_order
      ) values (
        p_restaurant_id,
        v_section_id,
        v_item->>'name',
        v_item->>'description',
        nullif(v_item->>'price_cents', '')::int,
        v_item->>'price_note',
        v_item_order
      );
      v_item_order := v_item_order + 1;
    end loop;

    v_section_order := v_section_order + 1;
  end loop;
end;
$$;
