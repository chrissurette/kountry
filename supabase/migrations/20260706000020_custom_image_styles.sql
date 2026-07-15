-- User-saved named image-gen prompts, alongside the hardcoded
-- IMAGE_STYLE_PRESETS (src/lib/menu/image-styles.ts). Lets an owner save a
-- custom prompt they liked (from either a one-off custom prompt or a tweak
-- of a built-in preset) and pick it again next time, instead of retyping it.
create table custom_image_styles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  prompt_fragment text not null,
  created_at timestamptz not null default now()
);

create index custom_image_styles_restaurant_id_idx on custom_image_styles(restaurant_id);

alter table custom_image_styles enable row level security;

create policy custom_image_styles_all_member on custom_image_styles
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );
