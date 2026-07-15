-- Add an "employee" login that can ONLY use the Daily Special generator
-- (role-gated in src/lib/supabase/middleware.ts + hidden nav links).
--
-- Fully self-contained: creates the auth user directly (no dashboard step),
-- widens the restaurant_members.role check constraint if needed, and links
-- the account to your restaurant as role=employee. Safe to re-run — if the
-- employee user already exists, it just resets the password/username instead
-- of erroring.
--
-- Credentials (as requested):
--   email:    employee@kkimmokalee.com
--   username: employee
--   password: kkimmokalee
--
-- Requires pgcrypto (Supabase projects have it available in the `extensions`
-- schema already; the CREATE EXTENSION below is a no-op if so).

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_email        text := 'employee@kkimmokalee.com';
  v_username     text := 'employee';
  v_password     text := 'kkimmokalee';
  v_user_id      uuid;
  v_restaurant_id uuid;
begin
  -- Allow role='employee' even if the member_roles migration hasn't run yet.
  alter table restaurant_members drop constraint if exists restaurant_members_role_check;
  alter table restaurant_members add constraint restaurant_members_role_check check (role in ('owner', 'employee'));

  select id into v_restaurant_id from restaurants order by created_at limit 1;
  if v_restaurant_id is null then
    raise exception 'No restaurant row found — run bootstrap_owner.sql first.';
  end if;

  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );

    raise notice 'Created new auth user % for %', v_user_id, v_email;
  else
    update auth.users
    set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;

    raise notice 'Updated existing auth user % (%) with new password', v_user_id, v_email;
  end if;

  insert into restaurant_members (user_id, restaurant_id, role, username)
  values (v_user_id, v_restaurant_id, 'employee', v_username)
  on conflict (user_id, restaurant_id)
    do update set role = excluded.role, username = excluded.username;

  raise notice 'Linked employee % to restaurant % (role=employee, username=%)', v_user_id, v_restaurant_id, v_username;
end $$;
