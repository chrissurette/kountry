-- One-time single-owner bootstrap (docs/07 Phase 0). Restaurant creation and
-- membership are intentionally NOT exposed via a public client-insert API yet
-- (see restaurants RLS policies) -- run this once by hand after the owner's
-- auth user exists, to create the restaurant profile row and link it.
--
-- Steps:
--   1. Create the owner's auth user in the Supabase dashboard: Authentication ->
--      Users -> Add user, set an email + password, and enable "Auto Confirm
--      User". (The app only signs in with email + password — it has no public
--      sign-up — so the user must be created here first.)
--   2. Find that user's id: select id, email from auth.users;
--   3. Replace the two placeholders below and run this file (SQL editor or
--      `supabase db execute -f supabase/seed/bootstrap_owner.sql`).

do $$
declare
  v_owner_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <- replace with auth.users.id
  v_restaurant_id uuid;
begin
  insert into restaurants (slug, name, menu_defaults)
  values (
    'my-restaurant',           -- <- replace with a URL-safe slug, e.g. 'joes-diner'
    'My Restaurant',           -- <- replace with the real restaurant name
    '{"currency": "USD", "section_order": []}'::jsonb
  )
  returning id into v_restaurant_id;

  insert into restaurant_members (user_id, restaurant_id, role)
  values (v_owner_user_id, v_restaurant_id, 'owner');

  raise notice 'Created restaurant % linked to owner %', v_restaurant_id, v_owner_user_id;
end $$;
