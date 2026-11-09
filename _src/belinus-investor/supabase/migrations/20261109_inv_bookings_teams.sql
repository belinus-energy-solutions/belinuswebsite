-- Teams meeting per video appointment (EVChargeking investor area).
alter table public.inv_bookings add column if not exists meet_url text;
alter table public.inv_bookings add column if not exists meet_id text;
