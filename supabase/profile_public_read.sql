-- Run in Supabase SQL Editor so profiles can be viewed by others

drop policy if exists "Users can view own profile" on public.profiles;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
on public.profiles
for select
to public
using (true);
