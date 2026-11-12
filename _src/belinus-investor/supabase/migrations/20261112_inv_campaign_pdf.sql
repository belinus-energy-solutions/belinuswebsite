-- Information PDF per campaign: none, a fixed PDF uploaded for the campaign, or the personal PDF generated per investor.
alter table public.inv_campaigns add column if not exists pdf_mode text not null default 'none' check (pdf_mode in ('none', 'fixed', 'personal'));

-- The fixed PDF itself (base64). Kept apart from inv_campaigns so campaign lists stay small.
create table if not exists public.inv_campaign_files (
  campaign_id uuid primary key references public.inv_campaigns(id) on delete cascade,
  name text not null,
  mime text not null default 'application/pdf',
  data_b64 text not null,
  created_at timestamptz not null default now()
);
alter table public.inv_campaign_files enable row level security;
