-- Run in Supabase SQL Editor

alter table public.profiles
add column if not exists linkedin_url text,
add column if not exists instagram_url text;
