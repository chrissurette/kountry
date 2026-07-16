-- Rate limiting for the two unauthenticated public POST endpoints
-- (subscribe + unsubscribe) — docs/07's Phase 4 known gap, decided 2026-07-16.
--
-- Why Postgres and not an in-process counter: this deploys to Netlify
-- serverless, where a per-instance Map resets on every cold start and never
-- sees traffic hitting other instances. The database is the only shared
-- state already in the stack, and adding a dedicated store (Redis etc.)
-- would contradict docs/01's low-maintenance stance for what is a
-- low-traffic defense.
--
-- Privacy (docs/09, /privacy): the key is an HMAC-SHA256 of the client IP
-- keyed with a server-only secret — the raw IP is NEVER stored, and without
-- the secret the hash can't be reversed by enumerating the IPv4 space.
-- Rows self-expire: every call deletes counters whose window started more
-- than a day ago, so the table stays tiny and nothing lingers.
create table rate_limit_counters (
  key text primary key,          -- "{scope}:{hmac(ip)}", never a raw IP
  window_start timestamptz not null,
  count int not null default 0
);

-- RLS on, deliberately with NO policies: no session-scoped client has any
-- business reading or writing counters. Only the service-role client (which
-- bypasses RLS) touches this table, via bump_rate_limit below.
alter table rate_limit_counters enable row level security;

-- Atomic check-and-increment for a fixed window. One statement, so two
-- concurrent requests can't both slip under the limit by racing a separate
-- read-then-write. Returns whether the request is ALLOWED.
--
-- A window that has fully elapsed resets in place (count back to 1, new
-- window_start) rather than needing its row deleted first — the delete
-- below is just housekeeping so abandoned keys don't accumulate.
create or replace function bump_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_allowed boolean;
begin
  -- Opportunistic cleanup: the table is bounded by "distinct keys seen in
  -- the last day", small enough that a sweep per call is cheap.
  delete from rate_limit_counters where window_start < v_now - interval '1 day';

  insert into rate_limit_counters as c (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set count = case
          when c.window_start < v_now - make_interval(secs => p_window_seconds) then 1
          else c.count + 1
        end,
        window_start = case
          when c.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
          else c.window_start
        end
  returning count <= p_limit into v_allowed;

  return v_allowed;
end;
$$;
