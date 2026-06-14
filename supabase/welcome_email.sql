-- Run in Supabase SQL Editor after profiles.sql
-- Tracks welcome emails so each member only receives one onboarding message.

create table if not exists public.welcome_emails_sent (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('sent', 'skipped_legacy')),
  sent_at timestamptz not null default now()
);

alter table public.welcome_emails_sent enable row level security;

-- No public policies: only service-role edge functions should touch this table.
