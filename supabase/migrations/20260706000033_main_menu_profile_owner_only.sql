-- Owner-only RLS for the Main Menu and the restaurant profile's *edits*
-- (2026-07-16, owner's call after an employee-access audit).
--
-- WHY: the audit proved that an employee — using their own login, straight
-- from browser dev tools, bypassing the app's routes entirely — could insert
-- Main Menu rows and update the restaurant profile. Both are content on the
-- LIVE PUBLIC SITE. The middleware blocked the /admin pages and the /api
-- routes, but nothing blocked the database. This closes that.
--
-- This extends the deliberate exception first made for `subscribers` (..029)
-- and `email_fax_requests` (..031): the project's default is "the role
-- boundary lives in the middleware, not in RLS", and that still holds for
-- the Daily Special tables an employee legitimately works in. The exception
-- now covers customer PII, live credentials, AND owner-controlled public site
-- content. See docs/03's RLS note and docs/09.
--
-- No RPC bypass exists: replace_main_menu() is declared `security invoker`
-- (migrations ..015/..016), so it runs with the caller's rights and these
-- policies apply to it too — verified before writing this.

-- ---------------------------------------------------------------------------
-- Main Menu — owner-only, read and write.
-- ---------------------------------------------------------------------------
-- Safe to lock down completely (verified, not assumed):
--   * the employee's Daily Special flow never reads main_menu at all;
--   * the public /menu page reads it through the service-role client
--     (src/lib/public-main-menu/service.ts), which bypasses RLS — so the
--     live site is unaffected.
drop policy main_menu_sections_all_member on main_menu_sections;
drop policy main_menu_items_all_member on main_menu_items;

create policy main_menu_sections_owner_only on main_menu_sections
  for all using (
    restaurant_id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  ) with check (
    restaurant_id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy main_menu_items_owner_only on main_menu_items
  for all using (
    restaurant_id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  ) with check (
    restaurant_id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- Restaurant profile — UPDATE is owner-only. SELECT deliberately stays
-- member-level.
-- ---------------------------------------------------------------------------
-- **Do not "finish the job" by making SELECT owner-only too.** The employee's
-- own work depends on reading this row, and removing that breaks the product
-- for them (each verified against source):
--   * src/lib/auth/current-restaurant.ts — the /admin layout resolves the
--     restaurant here; with no read, every employee screen degrades to the
--     "Almost there / no restaurant linked" dead end.
--   * render-special-service.ts + parse-special-menu-service.ts — the
--     standardized letterhead (name/address/phone) is read from this row at
--     parse and render time, by design (2026-07-15's owner call). No read =
--     no letterhead on the menu an employee renders.
--   * publish/service.ts createSnapshot — freezes the profile into the
--     immutable snapshot payload.
-- None of that is a leak: the profile is *published on the public website*.
-- Address, phone and hours are on every page. There is nothing to hide from
-- an employee here — the risk was only ever unauthorized *edits*.
drop policy restaurants_update_member on restaurants;

create policy restaurants_update_owner_only on restaurants
  for update using (
    id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  ) with check (
    id in (
      select restaurant_id from restaurant_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- NOTE — the one thing this policy also blocks, handled in code:
-- publishing flips restaurants.live_snapshot_id/live_since, which is an
-- UPDATE on this table, and publishing IS an employee's job (docs/04's role
-- gate deliberately allows it). That single write moved to the service-role
-- client in publishMenuNow (src/lib/publish/service.ts) — it's still scoped
-- to the caller's own restaurant via getRestaurantIdOrThrow() on the session
-- client, and it's the same thing the cron promotion has always done. The
-- scheduled-publish path (api/cron/promote-schedules) already used
-- service-role and is unaffected.
