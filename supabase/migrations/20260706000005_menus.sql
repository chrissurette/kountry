-- Draft/working menus, their sections, and their items.
create table menus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  title text,
  service_date date,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  source_asset_id uuid references assets(id),
  parse_meta jsonb not null default '{}'::jsonb,   -- {provider, model, confidence, raw_response_ref}
  theme_id uuid references themes(id),
  style_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menus_restaurant_id_idx on menus(restaurant_id);
create index menus_restaurant_status_idx on menus(restaurant_id, status);

create trigger menus_set_updated_at
  before update on menus
  for each row execute function set_updated_at();

create table menu_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create index menu_sections_menu_id_idx on menu_sections(menu_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  section_id uuid references menu_sections(id) on delete cascade,
  name text not null,
  description text,
  price_cents int,             -- integer cents always; never store floats
  price_note text,             -- escape hatch: "market price", "12/18"
  sort_order int not null default 0,
  confidence real,             -- from OCR; drives review-screen flags
  library_item_id uuid         -- FK to item_library added in a later migration
);

create index menu_items_menu_id_idx on menu_items(menu_id);
create index menu_items_section_id_idx on menu_items(section_id);

alter table menus enable row level security;
alter table menu_sections enable row level security;
alter table menu_items enable row level security;

create policy menus_all_member on menus
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

create policy menu_sections_all_member on menu_sections
  for all using (
    menu_id in (
      select id from menus where restaurant_id in (
        select restaurant_id from restaurant_members where user_id = auth.uid()
      )
    )
  ) with check (
    menu_id in (
      select id from menus where restaurant_id in (
        select restaurant_id from restaurant_members where user_id = auth.uid()
      )
    )
  );

create policy menu_items_all_member on menu_items
  for all using (
    menu_id in (
      select id from menus where restaurant_id in (
        select restaurant_id from restaurant_members where user_id = auth.uid()
      )
    )
  ) with check (
    menu_id in (
      select id from menus where restaurant_id in (
        select restaurant_id from restaurant_members where user_id = auth.uid()
      )
    )
  );
