-- Run in Supabase SQL Editor → New query → paste → Run

alter table public.profiles
add column if not exists contact_email text,
add column if not exists contact_phone text,
add column if not exists show_contact_email boolean not null default false,
add column if not exists show_contact_phone boolean not null default false;

create or replace function public.get_profile_contact(target_user_id uuid)
returns table (
  contact_email text,
  contact_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    case when p.show_contact_email then nullif(trim(p.contact_email), '') else null end,
    case when p.show_contact_phone then nullif(trim(p.contact_phone), '') else null end
  from public.profiles p
  where p.user_id = target_user_id;
end;
$$;

revoke all on function public.get_profile_contact(uuid) from public;
grant execute on function public.get_profile_contact(uuid) to authenticated;
