alter table public.vehicle_market_analyses
  add column if not exists visible_repair_cost_low numeric,
  add column if not exists visible_repair_cost_high numeric,
  add column if not exists visible_repair_cost_estimate numeric,
  add column if not exists hidden_damage_contingency_low numeric,
  add column if not exists hidden_damage_contingency_high numeric,
  add column if not exists hidden_damage_contingency_estimate numeric,
  add column if not exists vision_detected_mileage numeric,
  add column if not exists vision_detected_mileage_unit text,
  add column if not exists mileage_mismatch boolean not null default false;
