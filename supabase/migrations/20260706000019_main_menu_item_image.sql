-- Optional per-item photo (docs: admin can attach a photo to any Main Menu
-- item; the public /menu page shows it in a small hover/tap popover). Stored
-- in the public site-media bucket like hero/gallery photos, path on the row
-- directly (same pattern as menus.generated_image_path) rather than through
-- site_media, since this is a strict 1:1 item-to-image relationship, not a
-- collection.
alter table main_menu_items add column image_path text;

-- Recreate to accept image_path (CREATE OR REPLACE can't change an existing
-- function's behavior without being restated in full). Item ids always
-- rotate on replace (delete+reinsert), but image_path is just a plain string
-- value carried through in the payload, so existing images survive edits to
-- unrelated fields as long as the caller round-trips the value it was given.
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
        restaurant_id, section_id, name, description, price_cents, price_note, image_path, sort_order
      ) values (
        p_restaurant_id,
        v_section_id,
        v_item->>'name',
        v_item->>'description',
        nullif(v_item->>'price_cents', '')::int,
        v_item->>'price_note',
        v_item->>'image_path',
        v_item_order
      );
      v_item_order := v_item_order + 1;
    end loop;

    v_section_order := v_section_order + 1;
  end loop;
end;
$$;
