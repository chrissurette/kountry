-- Scheduled go-live. The snapshot is created at schedule time (not at fire
-- time) so what goes live is exactly what was approved. Vercel Cron polls
-- for due, pending rows and promotes them idempotently (docs/02).
create table publish_schedules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  snapshot_id uuid not null references published_snapshots(id) on delete cascade,
  fire_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'canceled')),
  fired_at timestamptz,
  created_at timestamptz not null default now()
);

-- Drives the cron promotion query: WHERE status='pending' AND fire_at <= now().
create index publish_schedules_pending_fire_at_idx on publish_schedules(fire_at)
  where status = 'pending';

alter table publish_schedules enable row level security;

create policy publish_schedules_all_member on publish_schedules
  for all using (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  ) with check (
    restaurant_id in (select restaurant_id from restaurant_members where user_id = auth.uid())
  );
