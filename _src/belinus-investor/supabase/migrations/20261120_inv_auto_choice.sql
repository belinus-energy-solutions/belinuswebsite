-- Automatic choice: a campaign can register a choice for its recipients who have not chosen by a given moment.
-- inv_choices.auto marks such a registration; it stays changeable by the investor (it is not binding before signature).
alter table public.inv_choices add column if not exists auto boolean not null default false;
alter table public.inv_campaigns add column if not exists auto_choice text check (auto_choice in ('A', 'B'));
alter table public.inv_campaigns add column if not exists auto_choice_at timestamptz;
alter table public.inv_campaigns add column if not exists auto_choice_done_at timestamptz;
