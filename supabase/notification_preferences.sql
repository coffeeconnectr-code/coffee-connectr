-- Run in Supabase SQL Editor → New query → paste → Run

alter table public.profiles
add column if not exists email_on_message boolean not null default true;
