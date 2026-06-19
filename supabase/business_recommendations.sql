-- Run in Supabase SQL Editor.
-- Stores member business recommendations and supports the recommendation email edge function.
--
-- Deploy edge function (required for Send recommendation to work):
--   npx supabase functions deploy send-business-recommendation --project-ref xfrgctnrafhhcfkcoplp
--
-- Then run recommendation_rewards.sql to track sign-ups and grant bonus free months.

create table if not exists public.business_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommended_by_user_id uuid not null references auth.users (id) on delete cascade,
  contact_name text not null,
  business_name text not null,
  business_type text,
  location text,
  latitude double precision,
  longitude double precision,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists business_recommendations_recommended_by_user_id_idx
on public.business_recommendations (recommended_by_user_id, created_at desc);

create index if not exists business_recommendations_email_idx
on public.business_recommendations (email, created_at desc);

alter table public.business_recommendations enable row level security;

create policy "Members can view their own recommendations"
on public.business_recommendations
for select
to authenticated
using (
  recommended_by_user_id = auth.uid()
  or public.is_current_user_admin()
);

create policy "Members can create recommendations"
on public.business_recommendations
for insert
to authenticated
with check (recommended_by_user_id = auth.uid());

grant select, insert on public.business_recommendations to authenticated;
grant all on public.business_recommendations to service_role;
