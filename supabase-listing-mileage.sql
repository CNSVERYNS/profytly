alter table public.vehicles
  add column if not exists listing_mileage numeric,
  add column if not exists listing_mileage_unit text,
  add column if not exists listing_mileage_captured_at timestamptz;

comment on column public.vehicles.listing_mileage is
  'Mileage captured directly from the auction listing or entered as listing evidence.';

comment on column public.vehicles.mileage is
  'Working mileage used by the application; may come from listing data, manual entry, or accepted vision evidence.';
