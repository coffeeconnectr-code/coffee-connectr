-- Run in Supabase SQL Editor after profiles.sql

alter table public.profiles
add column if not exists latitude double precision,
add column if not exists longitude double precision;
