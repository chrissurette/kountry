-- Private Storage bucket for menu photos, logos, style references, and
-- exports (docs/01, docs/08: uploaded images stay private, served via
-- signed URLs). Object paths are always `${restaurant_id}/${kind}/${uuid}.ext`
-- (see src/app/api/uploads/route.ts), so RLS can scope access by the first
-- path segment without a join back to the assets table.
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

create policy assets_bucket_select_member on storage.objects
  for select using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from restaurant_members where user_id = auth.uid()
    )
  );

create policy assets_bucket_insert_member on storage.objects
  for insert with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from restaurant_members where user_id = auth.uid()
    )
  );

create policy assets_bucket_delete_member on storage.objects
  for delete using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from restaurant_members where user_id = auth.uid()
    )
  );
