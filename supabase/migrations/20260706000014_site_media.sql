-- Staff-uploadable marketing photos (hero + gallery) for the public site
-- (docs/06 "hybrid" content decision: live data from Supabase, prose in-repo,
-- photos staff-editable). Deliberately a separate table + bucket from
-- `assets`/`assets` bucket: those stay private (menu photos, style refs,
-- exports never go public), whereas hero/gallery images must be readable by
-- anonymous website visitors with no signed-URL churn.
create table site_media (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  kind text not null check (kind in ('hero', 'gallery')),
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index site_media_restaurant_id_idx on site_media(restaurant_id);

alter table site_media enable row level security;

create policy site_media_all_member on site_media
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

-- Public read (anyone) — this is the whole point of a separate bucket.
create policy site_media_bucket_public_read on storage.objects
  for select using (bucket_id = 'site-media');

create policy site_media_bucket_insert_member on storage.objects
  for insert with check (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from restaurant_members where user_id = auth.uid()
    )
  );

create policy site_media_bucket_delete_member on storage.objects
  for delete using (
    bucket_id = 'site-media'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from restaurant_members where user_id = auth.uid()
    )
  );
