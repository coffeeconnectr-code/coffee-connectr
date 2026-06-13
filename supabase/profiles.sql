-- Run this in Supabase: SQL Editor → New query → paste → Run

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null unique,
  profile_type text not null check (profile_type in ('individual', 'business')),

  -- Shared fields
  name text not null,
  profile_photo_url text,
  cover_image_url text,
  location text,
  primary_category text,
  secondary_categories text[] not null default '{}',
  about_bio text,
  website text,

  -- Individual-only fields
  job_title_role text,
  years_of_experience integer,
  skills_specialties text[] not null default '{}',
  certifications text,
  open_to_status text[] not null default '{}',
  languages text[] not null default '{}',

  -- Business-only fields
  business_type text,
  year_established integer,
  team_size text,
  services_offered text,
  opening_hours text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 3. Row Level Security (users can only access their own profile)
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4. Storage buckets for images
insert into storage.buckets (id, name, public)
values
  ('profile-photos', 'profile-photos', true),
  ('cover-images', 'cover-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read profile photos" on storage.objects;
create policy "Public read profile photos"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');

drop policy if exists "Users upload own profile photos" on storage.objects;
create policy "Users upload own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own profile photos" on storage.objects;
create policy "Users update own profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public read cover images" on storage.objects;
create policy "Public read cover images"
on storage.objects
for select
to public
using (bucket_id = 'cover-images');

drop policy if exists "Users upload own cover images" on storage.objects;
create policy "Users upload own cover images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cover-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own cover images" on storage.objects;
create policy "Users update own cover images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cover-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
