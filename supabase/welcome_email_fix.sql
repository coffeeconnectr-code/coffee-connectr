-- Run in Supabase SQL Editor if send-welcome-email returns a 500 error.
-- Safe to re-run.

create table if not exists public.welcome_emails_sent (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('sent', 'skipped_legacy')),
  sent_at timestamptz not null default now()
);

alter table public.welcome_emails_sent disable row level security;

grant select, insert, update, delete on public.welcome_emails_sent to service_role;

-- Allow retry for a specific account after fixing setup:
-- delete from public.welcome_emails_sent
-- where user_id = (
--   select id from auth.users where lower(email) = lower('your@email.com')
-- );
