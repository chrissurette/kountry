-- The real menu (docs/03: Main Menu, added 2026-07-14) turned out to be
-- large (~200 items across breakfast/lunch/dinner/beverages) with shared
-- per-section instructional text ("Served with soup or side salad...") and
-- a natural top-level grouping the public /menu page uses for jump
-- navigation. Both were missing from the original main_menu_sections shape.
alter table main_menu_sections
  add column description text,
  add column category text not null default 'lunch_dinner'
    check (category in ('breakfast', 'lunch_dinner', 'beverages'));

-- Recreate to accept the two new fields (CREATE OR REPLACE can't change an
-- existing function's behavior without being restated in full).
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
    insert into main_menu_sections (restaurant_id, name, description, category, sort_order)
    values (
      p_restaurant_id,
      v_section->>'name',
      v_section->>'description',
      coalesce(v_section->>'category', 'lunch_dinner'),
      v_section_order
    )
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
