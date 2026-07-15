-- Atomic bulk replace of a menu's sections + items, used by both the OCR
-- parse step and the Review & Correct screen's save (docs/04: "PATCH accepts
-- full sections+items payload so the review screen saves atomically").
-- PostgREST/supabase-js has no multi-statement client transaction, so this
-- lives in a single function call instead, which runs in one transaction.
--
-- p_sections shape: [{ "name": text, "sort_order": int, "items": [
--   { "name": text, "description": text|null, "price_cents": int|null,
--     "price_note": text|null, "confidence": real|null, "library_item_id": uuid|null }
-- ]}]
create or replace function replace_menu_content(
  p_menu_id uuid,
  p_title text,
  p_service_date date,
  p_sections jsonb
)
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
  -- security invoker + RLS on menus/menu_sections/menu_items means this can
  -- only ever touch a menu the caller already has access to.
  update menus set title = p_title, service_date = p_service_date where id = p_menu_id;

  delete from menu_sections where menu_id = p_menu_id;

  for v_section in select * from jsonb_array_elements(p_sections)
  loop
    insert into menu_sections (menu_id, name, sort_order)
    values (p_menu_id, v_section->>'name', v_section_order)
    returning id into v_section_id;

    v_item_order := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_section->'items', '[]'::jsonb))
    loop
      insert into menu_items (
        menu_id, section_id, name, description, price_cents, price_note,
        sort_order, confidence, library_item_id
      ) values (
        p_menu_id,
        v_section_id,
        v_item->>'name',
        v_item->>'description',
        nullif(v_item->>'price_cents', '')::int,
        v_item->>'price_note',
        v_item_order,
        nullif(v_item->>'confidence', '')::real,
        nullif(v_item->>'library_item_id', '')::uuid
      );
      v_item_order := v_item_order + 1;
    end loop;

    v_section_order := v_section_order + 1;
  end loop;
end;
$$;
