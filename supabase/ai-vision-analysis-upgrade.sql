alter table public.vehicle_market_analyses
  add column if not exists as_is_value_low numeric,
  add column if not exists as_is_value_high numeric,
  add column if not exists as_is_value_estimate numeric,
  add column if not exists vision_used boolean not null default false,
  add column if not exists image_count_analyzed integer not null default 0
    check (image_count_analyzed >= 0),
  add column if not exists visible_damage jsonb not null default '[]'::jsonb,
  add column if not exists hidden_damage_risks jsonb not null default '[]'::jsonb;
