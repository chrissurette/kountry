-- Tighten subscribers RLS to owner-only (docs/09's open recommendation,
-- decided 2026-07-16 — this closes it).
--
-- This is a DELIBERATE EXCEPTION to the project's documented "the role
-- boundary lives in the middleware, not in RLS" pattern (CLAUDE.md): every
-- other table's policy grants any restaurant member full access, and the
-- middleware alone confines employees to the Daily Special generator. That
-- pattern is fine where the data is the restaurant's own content — but
-- subscribers is customer PII (emails/phones of real people), the most
-- sensitive table in the schema, and the one place a single middleware
-- mistake would otherwise be the only thing between an employee account and
-- every customer's contact details. Defense in depth is worth the deviation
-- here; if a future table needs the same, make it a conscious choice, not a
-- copy-paste.
--
-- Strictly tightening, no functional change: employees were already blocked
-- from /api/subscribers at the route level (src/lib/supabase/middleware.ts's
-- allowlist), and every session-scoped read/write of this table lives behind
-- those routes. The public subscribe/unsubscribe paths use the service-role
-- client (no session exists there), which bypasses RLS entirely — they are
-- unaffected by policy changes.
drop policy subscribers_all_member on subscribers;

create policy subscribers_owner_only on subscribers
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
