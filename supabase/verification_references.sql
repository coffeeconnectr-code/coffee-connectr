-- Run in Supabase SQL Editor after admin.sql
-- Requires 3 industry references for verification requests and stores them for admin review.
--
-- Deploy edge function:
--   npx supabase functions deploy send-verification-reference-emails --project-ref xfrgctnrafhhcfkcoplp

create table if not exists public.verification_request_references (
  id uuid primary key default gen_random_uuid(),
  verification_request_id uuid not null references public.verification_requests (id) on delete cascade,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  sort_order integer not null check (sort_order between 1 and 3),
  reference_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (verification_request_id, sort_order)
);

create index if not exists verification_request_references_request_id_idx
on public.verification_request_references (verification_request_id, sort_order);

alter table public.verification_request_references enable row level security;

drop policy if exists "Users can view own verification references" on public.verification_request_references;
create policy "Users can view own verification references"
on public.verification_request_references
for select
to authenticated
using (
  exists (
    select 1
    from public.verification_requests vr
    where vr.id = verification_request_id
      and vr.user_id = auth.uid()
  )
  or public.is_current_user_admin()
);

grant select on public.verification_request_references to authenticated;
grant all on public.verification_request_references to service_role;

drop function if exists public.submit_verification_request(text);

create or replace function public.submit_verification_request(
  p_message text default null,
  p_references jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  v_ref jsonb;
  v_index integer;
  v_business_name text;
  v_contact_name text;
  v_email text;
  v_phone text;
  v_address text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if exists (
    select 1
    from public.verification_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'You already have a pending verification request';
  end if;

  if jsonb_typeof(p_references) <> 'array' or jsonb_array_length(p_references) <> 3 then
    raise exception 'Exactly 3 industry references are required';
  end if;

  for v_index in 0..2 loop
    v_ref := p_references -> v_index;
    v_business_name := trim(coalesce(v_ref ->> 'business_name', ''));
    v_contact_name := trim(coalesce(v_ref ->> 'contact_name', ''));
    v_email := lower(trim(coalesce(v_ref ->> 'email', '')));
    v_phone := trim(coalesce(v_ref ->> 'phone', ''));
    v_address := trim(coalesce(v_ref ->> 'address', ''));

    if v_business_name = '' or char_length(v_business_name) > 160 then
      raise exception 'Reference %: business name is required', v_index + 1;
    end if;

    if v_contact_name = '' or char_length(v_contact_name) > 120 then
      raise exception 'Reference %: contact name is required', v_index + 1;
    end if;

    if v_email = '' or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Reference %: a valid email is required', v_index + 1;
    end if;

    if v_phone = '' or char_length(v_phone) > 40 then
      raise exception 'Reference %: phone number is required', v_index + 1;
    end if;

    if v_address = '' or char_length(v_address) > 240 then
      raise exception 'Reference %: address is required', v_index + 1;
    end if;
  end loop;

  insert into public.verification_requests (user_id, message)
  values (auth.uid(), nullif(trim(p_message), ''))
  returning id into new_id;

  for v_index in 0..2 loop
    v_ref := p_references -> v_index;
    insert into public.verification_request_references (
      verification_request_id,
      business_name,
      contact_name,
      email,
      phone,
      address,
      sort_order
    )
    values (
      new_id,
      trim(v_ref ->> 'business_name'),
      trim(v_ref ->> 'contact_name'),
      lower(trim(v_ref ->> 'email')),
      trim(v_ref ->> 'phone'),
      trim(v_ref ->> 'address'),
      v_index + 1
    );
  end loop;

  return new_id;
end;
$$;

grant execute on function public.submit_verification_request(text, jsonb) to authenticated;

drop function if exists public.admin_list_verification_requests(text);

create or replace function public.admin_list_verification_requests(p_status text default 'pending')
returns table (
  id uuid,
  user_id uuid,
  profile_name text,
  message text,
  status text,
  admin_reason text,
  reviewed_at timestamptz,
  created_at timestamptz,
  industry_references jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select
    vr.id,
    vr.user_id,
    p.name as profile_name,
    vr.message,
    vr.status,
    vr.admin_reason,
    vr.reviewed_at,
    vr.created_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ref.id,
            'business_name', ref.business_name,
            'contact_name', ref.contact_name,
            'email', ref.email,
            'phone', ref.phone,
            'address', ref.address,
            'sort_order', ref.sort_order,
            'reference_email_sent_at', ref.reference_email_sent_at
          )
          order by ref.sort_order
        )
        from public.verification_request_references ref
        where ref.verification_request_id = vr.id
      ),
      '[]'::jsonb
    ) as industry_references
  from public.verification_requests vr
  left join public.profiles p on p.user_id = vr.user_id
  where p_status = '' or vr.status = p_status
  order by vr.created_at desc;
end;
$$;

grant execute on function public.admin_list_verification_requests(text) to authenticated;
