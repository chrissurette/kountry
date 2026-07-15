-- Allow an 'employee' role alongside 'owner'. Employees are app-gated
-- (src/lib/supabase/middleware.ts) to ONLY the Daily Special generator —
-- /admin/menus/* and the upload/parse/render/publish/schedule APIs it calls.
-- Everything else in /admin (Main Menu, History, Library, Site Photos,
-- Settings) and the owner-only APIs redirect/403 for them. RLS itself is
-- member-level (any member of the restaurant can write its menus/snapshots),
-- so the role separation lives in the middleware gate, not in RLS.
alter table restaurant_members drop constraint restaurant_members_role_check;
alter table restaurant_members add constraint restaurant_members_role_check check (role in ('owner', 'employee'));
