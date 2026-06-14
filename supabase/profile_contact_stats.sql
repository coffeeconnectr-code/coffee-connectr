-- Run in Supabase SQL Editor → New query → paste → Run

create or replace function public.get_profile_contact_stats(target_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  contacted_count integer;
  contacted_by_count integer;
begin
  select count(distinct recipient_id)
  into contacted_count
  from public.messages
  where sender_id = target_user_id;

  select count(distinct sender_id)
  into contacted_by_count
  from public.messages
  where recipient_id = target_user_id;

  return json_build_object(
    'contacted_count', coalesce(contacted_count, 0),
    'contacted_by_count', coalesce(contacted_by_count, 0)
  );
end;
$$;

revoke all on function public.get_profile_contact_stats(uuid) from public;
grant execute on function public.get_profile_contact_stats(uuid) to anon, authenticated;
