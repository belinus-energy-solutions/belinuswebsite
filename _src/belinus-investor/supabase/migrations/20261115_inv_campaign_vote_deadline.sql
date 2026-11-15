-- Voting deadline of a Bolero vote campaign; after it the public vote page refuses new votes.
alter table public.inv_campaigns add column if not exists vote_deadline timestamptz;
