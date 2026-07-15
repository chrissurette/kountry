-- Timestamp of when the current live special was flipped live. Drives the
-- "daily special auto-clears at midnight" behavior (docs/02): the
-- promote-schedules cron clears restaurants.live_snapshot_id once live_since
-- falls on a previous calendar day in the restaurant's timezone, so a stale
-- special never lingers past the day it was published. Null whenever nothing
-- is live.
alter table restaurants add column live_since timestamptz;
