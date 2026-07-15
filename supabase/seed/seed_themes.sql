-- Seed the shared theme catalog (docs/03: "seeded rows, not code"). Run once
-- against a fresh database after migrations, e.g.:
--   supabase db execute -f supabase/seed/seed_themes.sql
-- or paste into the Supabase SQL editor. Idempotent via ON CONFLICT on key.

insert into themes (key, name, config) values
  ('classic', 'Classic', '{
    "layout": "single-column",
    "typography": {"headingWeight": 600, "scale": "comfortable"},
    "divider": "rule"
  }'::jsonb),
  ('modern-grid', 'Modern Grid', '{
    "layout": "two-column-grid",
    "typography": {"headingWeight": 700, "scale": "compact"},
    "divider": "none"
  }'::jsonb),
  ('chalkboard', 'Chalkboard', '{
    "layout": "single-column",
    "typography": {"headingWeight": 500, "scale": "comfortable", "display": "hand-lettered"},
    "divider": "dotted"
  }'::jsonb),
  ('minimal-list', 'Minimal List', '{
    "layout": "single-column",
    "typography": {"headingWeight": 400, "scale": "compact"},
    "divider": "whitespace"
  }'::jsonb)
on conflict (key) do nothing;
