-- Main Menu Spanish translation (step 2 of the site-wide Spanish work,
-- docs/06's "Language toggle" note): owner-reviewed Spanish name/description
-- alongside the existing English fields, filled in by a "Translate to
-- Spanish" action in the Main Menu editor rather than typed from scratch.
alter table main_menu_sections
  add column name_es text,
  add column description_es text;

alter table main_menu_items
  add column name_es text,
  add column description_es text;

-- New provider task: translate_menu (src/lib/providers/registry.ts resolves
-- it to the text/generateJson capability — src/lib/main-menu/translate-service.ts).
alter table provider_task_config drop constraint provider_task_config_task_check;
alter table provider_task_config add constraint provider_task_config_task_check
  check (task in ('ocr_parse', 'copywriting', 'image_gen', 'translate_menu'));

-- Recreate to persist the two new fields — replace_main_menu still
-- delete+reinserts every row on every save (CLAUDE.md's note on this
-- function), so the editor must always resend name_es/description_es
-- (even unchanged) or a plain English edit would silently drop translations.
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
    insert into main_menu_sections (restaurant_id, name, description, name_es, description_es, category, sort_order)
    values (
      p_restaurant_id,
      v_section->>'name',
      v_section->>'description',
      v_section->>'name_es',
      v_section->>'description_es',
      coalesce(v_section->>'category', 'lunch_dinner'),
      v_section_order
    )
    returning id into v_section_id;

    v_item_order := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_section->'items', '[]'::jsonb))
    loop
      insert into main_menu_items (
        restaurant_id, section_id, name, description, name_es, description_es, price_cents, price_note, image_path, sort_order
      ) values (
        p_restaurant_id,
        v_section_id,
        v_item->>'name',
        v_item->>'description',
        v_item->>'name_es',
        v_item->>'description_es',
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
