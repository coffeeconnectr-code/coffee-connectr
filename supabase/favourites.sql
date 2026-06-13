-- Run in Supabase SQL Editor → New query → paste → Run

create table if not exists public.profile_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  favourite_user_id uuid references auth.users (id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, favourite_user_id),
  check (user_id <> favourite_user_id)
);

create index if not exists profile_favourites_user_id_idx on public.profile_favourites (user_id);
create index if not exists profile_favourites_created_at_idx on public.profile_favourites (created_at desc);

alter table public.profile_favourites enable row level security;

drop policy if exists "Users can read own favourites" on public.profile_favourites;
create policy "Users can read own favourites"
on public.profile_favourites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can add favourites" on public.profile_favourites;
create policy "Users can add favourites"
on public.profile_favourites
for insert
to authenticated
with check (auth.uid() = user_id and user_id <> favourite_user_id);

drop policy if exists "Users can remove favourites" on public.profile_favourites;
create policy "Users can remove favourites"
on public.profile_favourites
for delete
to authenticated
using (auth.uid() = user_id);
