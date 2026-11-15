-- Bolero vote: one yes/no vote per investor per campaign, cast through a personal link (no account needed).
create table if not exists public.inv_votes (
  investor_id uuid not null references public.inv_investors(id) on delete cascade,
  campaign_id uuid not null references public.inv_campaigns(id) on delete cascade,
  token_hash text not null unique,
  vote text check (vote in ('yes', 'no')),
  voted_at timestamptz,
  ip text,
  created_at timestamptz not null default now(),
  primary key (investor_id, campaign_id)
);
alter table public.inv_votes enable row level security;
