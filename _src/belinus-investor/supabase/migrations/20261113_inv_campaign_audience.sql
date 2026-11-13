-- Audience of an announcement campaign: 'none_or_c' (no choice yet, or choice C) or 'a_b' (choice A or B).
alter table public.inv_campaigns add column if not exists audience text;
