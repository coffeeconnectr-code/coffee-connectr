-- Run in Supabase SQL Editor

alter table public.profiles
add column if not exists total_roasting_capacity_kg numeric,
add column if not exists contract_roasting_capacity_kg numeric;

create table if not exists public.profile_roasters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade not null,
  roaster_brand text not null,
  batch_size_kg numeric not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_roasters_brand_idx
on public.profile_roasters (roaster_brand);

create index if not exists profile_roasters_profile_id_idx
on public.profile_roasters (profile_id);

alter table public.profile_roasters enable row level security;

drop policy if exists "Roasters are viewable by everyone" on public.profile_roasters;
create policy "Roasters are viewable by everyone"
on public.profile_roasters
for select
to public
using (true);

drop policy if exists "Users can insert own roasters" on public.profile_roasters;
create policy "Users can insert own roasters"
on public.profile_roasters
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own roasters" on public.profile_roasters;
create policy "Users can update own roasters"
on public.profile_roasters
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own roasters" on public.profile_roasters;
create policy "Users can delete own roasters"
on public.profile_roasters
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
);
