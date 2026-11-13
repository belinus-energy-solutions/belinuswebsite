-- Extra paragraph for a reminder campaign (for example: answer this e-mail, or call the CEO). When set, the reminder is a normal mail so that replies arrive.
alter table public.inv_campaigns add column if not exists extra_text text;
