-- Optional username as an alternate login identifier. The owner can sign in
-- with either their email OR this username: the login server action
-- (src/app/login/actions.ts) resolves a username to the account's email via
-- the service-role client, then calls signInWithPassword. Stored lowercased;
-- the unique index enforces case-insensitive uniqueness so a username maps to
-- exactly one account. Nullable — accounts without a username sign in by email.
--
-- Note: restaurant_members has a self-SELECT RLS policy but no UPDATE policy,
-- so username edits from Settings go through the service-role client after
-- verifying the session user (src/app/admin/settings/account-actions.ts).
alter table restaurant_members add column username text;
create unique index restaurant_members_username_key on restaurant_members (lower(username));
