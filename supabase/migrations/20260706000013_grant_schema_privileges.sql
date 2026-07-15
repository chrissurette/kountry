-- Fresh Supabase projects are expected to pre-wire default privileges on the
-- public schema for anon/authenticated/service_role, but that wasn't in
-- place on at least one project used for local dev (every prior migration's
-- tables came back "permission denied" even for service_role, which bypasses
-- RLS but still needs a base GRANT). RLS policies are necessary but not
-- sufficient — Postgres checks table-level grants first. Idempotent and
-- harmless to re-run if the project already had these set.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
