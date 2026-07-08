-- Run in Supabase SQL Editor AFTER admin.sql
-- Member activity tracking + admin analytics dashboard.
--
-- Tracks page views, feature usage, and time-on-site for signed-in members.
-- Admins view aggregated analytics via /admin/analytics.

-- ---------------------------------------------------------------------------
-- 1. Activity tables
-- ---------------------------------------------------------------------------

create table if not exists public.user_activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  session_key text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  last_page_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_key)
);

create index if not exists user_activity_sessions_user_id_idx
on public.user_activity_sessions (user_id, last_seen_at desc);

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  session_key text,
  event_name text not null,
  page_path text,
  target_type text,
  target_id uuid,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_user_id_idx
on public.user_activity_events (user_id, created_at desc);

create index if not exists user_activity_events_event_name_idx
on public.user_activity_events (event_name, created_at desc);

create index if not exists user_activity_events_created_at_idx
on public.user_activity_events (created_at desc);

drop trigger if exists user_activity_sessions_set_updated_at on public.user_activity_sessions;

create trigger user_activity_sessions_set_updated_at
before update on public.user_activity_sessions
for each row
execute function public.set_updated_at();

alter table public.user_activity_sessions enable row level security;
alter table public.user_activity_events enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Client write RPCs
-- ---------------------------------------------------------------------------

create or replace function public.log_user_activity_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event jsonb;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'Events payload must be a JSON array';
  end if;

  for v_event in
    select value
    from jsonb_array_elements(p_events)
  loop
    if coalesce(trim(v_event->>'event_name'), '') = '' then
      continue;
    end if;

    insert into public.user_activity_events (
      user_id,
      session_key,
      event_name,
      page_path,
      target_type,
      target_id,
      properties
    )
    values (
      v_user_id,
      nullif(trim(v_event->>'session_key'), ''),
      trim(v_event->>'event_name'),
      nullif(trim(v_event->>'page_path'), ''),
      nullif(trim(v_event->>'target_type'), ''),
      nullif(trim(v_event->>'target_id'), '')::uuid,
      coalesce(v_event->'properties', '{}'::jsonb)
    );

    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

create or replace function public.upsert_user_activity_session(
  p_session_key text,
  p_page_path text default null,
  p_duration_seconds integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duration integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(trim(p_session_key), '') = '' then
    raise exception 'Session key is required';
  end if;

  v_duration := greatest(coalesce(p_duration_seconds, 0), 0);

  insert into public.user_activity_sessions (
    user_id,
    session_key,
    last_page_path,
    duration_seconds,
    last_seen_at
  )
  values (
    v_user_id,
    trim(p_session_key),
    nullif(trim(p_page_path), ''),
    v_duration,
    now()
  )
  on conflict (user_id, session_key) do update
  set
    last_page_path = coalesce(
      excluded.last_page_path,
      public.user_activity_sessions.last_page_path
    ),
    duration_seconds = public.user_activity_sessions.duration_seconds + excluded.duration_seconds,
    last_seen_at = now(),
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Admin read RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_analytics_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 1);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_active_members integer;
  v_total_events bigint;
  v_total_minutes bigint;
  v_top_events jsonb;
  v_top_pages jsonb;
  v_daily_active jsonb;
  v_feature_usage jsonb;
begin
  perform public.assert_current_user_admin();

  select count(distinct user_id)
  into v_active_members
  from public.user_activity_events
  where created_at >= v_since;

  select count(*)
  into v_total_events
  from public.user_activity_events
  where created_at >= v_since;

  select coalesce(sum(duration_seconds), 0)
  into v_total_minutes
  from public.user_activity_sessions
  where last_seen_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('event_name', event_name, 'count', event_count)
      order by event_count desc
    ),
    '[]'::jsonb
  )
  into v_top_events
  from (
    select event_name, count(*) as event_count
    from public.user_activity_events
    where created_at >= v_since
    group by event_name
    order by count(*) desc
    limit 15
  ) ranked_events;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('page_path', page_path, 'count', page_count)
      order by page_count desc
    ),
    '[]'::jsonb
  )
  into v_top_pages
  from (
    select coalesce(page_path, '(unknown)') as page_path, count(*) as page_count
    from public.user_activity_events
    where created_at >= v_since
      and event_name = 'page_view'
    group by coalesce(page_path, '(unknown)')
    order by count(*) desc
    limit 15
  ) ranked_pages;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('date', activity_date, 'count', member_count)
      order by activity_date asc
    ),
    '[]'::jsonb
  )
  into v_daily_active
  from (
    select
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as activity_date,
      count(distinct user_id) as member_count
    from public.user_activity_events
    where created_at >= v_since
    group by date_trunc('day', created_at)
    order by date_trunc('day', created_at) asc
  ) daily;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('event_name', event_name, 'count', event_count)
      order by event_count desc
    ),
    '[]'::jsonb
  )
  into v_feature_usage
  from (
    select event_name, count(*) as event_count
    from public.user_activity_events
    where created_at >= v_since
      and event_name <> 'page_view'
    group by event_name
    order by count(*) desc
    limit 20
  ) features;

  return jsonb_build_object(
    'days', v_days,
    'activeMembers', v_active_members,
    'totalEvents', v_total_events,
    'totalMinutes', floor(v_total_minutes / 60.0),
    'topEvents', v_top_events,
    'topPages', v_top_pages,
    'dailyActive', v_daily_active,
    'featureUsage', v_feature_usage
  );
end;
$$;

create or replace function public.admin_list_member_activity(
  p_search text default '',
  p_days integer default 30,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  profile_name text,
  profile_type text,
  last_seen_at timestamptz,
  total_time_seconds bigint,
  event_count bigint,
  session_count bigint,
  top_page text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 1);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_search text := lower(trim(coalesce(p_search, '')));
begin
  perform public.assert_current_user_admin();

  return query
  with event_stats as (
    select
      e.user_id,
      count(*) as event_count,
      max(e.created_at) as last_event_at
    from public.user_activity_events e
    where e.created_at >= v_since
    group by e.user_id
  ),
  session_stats as (
    select
      s.user_id,
      coalesce(sum(s.duration_seconds), 0)::bigint as total_time_seconds,
      count(*) as session_count,
      max(s.last_seen_at) as last_session_at
    from public.user_activity_sessions s
    where s.last_seen_at >= v_since
    group by s.user_id
  ),
  top_pages as (
    select distinct on (e.user_id)
      e.user_id,
      coalesce(e.page_path, '(unknown)') as page_path
    from public.user_activity_events e
    where e.created_at >= v_since
      and e.event_name = 'page_view'
    group by e.user_id, coalesce(e.page_path, '(unknown)')
    order by e.user_id, count(*) desc
  ),
  combined as (
    select
      coalesce(es.user_id, ss.user_id) as user_id,
      coalesce(es.event_count, 0)::bigint as event_count,
      coalesce(ss.total_time_seconds, 0)::bigint as total_time_seconds,
      coalesce(ss.session_count, 0)::bigint as session_count,
      greatest(es.last_event_at, ss.last_session_at) as last_seen_at
    from event_stats es
    full outer join session_stats ss on ss.user_id = es.user_id
  )
  select
    c.user_id,
    u.email::text,
    coalesce(p.name, 'No profile')::text as profile_name,
    coalesce(p.profile_type, 'unknown')::text as profile_type,
    c.last_seen_at,
    c.total_time_seconds,
    c.event_count,
    c.session_count,
    tp.page_path::text as top_page
  from combined c
  join auth.users u on u.id = c.user_id
  left join public.profiles p on p.user_id = c.user_id
  left join top_pages tp on tp.user_id = c.user_id
  where
    v_search = ''
    or lower(u.email) like '%' || v_search || '%'
    or lower(coalesce(p.name, '')) like '%' || v_search || '%'
  order by c.last_seen_at desc nulls last
  limit greatest(least(coalesce(p_limit, 50), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_list_activity_events(
  p_search text default '',
  p_event_name text default '',
  p_days integer default 30,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  profile_name text,
  event_name text,
  page_path text,
  target_type text,
  target_id uuid,
  properties jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 1);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_search text := lower(trim(coalesce(p_search, '')));
  v_event_name text := lower(trim(coalesce(p_event_name, '')));
begin
  perform public.assert_current_user_admin();

  return query
  select
    e.id,
    e.user_id,
    u.email::text,
    coalesce(p.name, 'No profile')::text as profile_name,
    e.event_name::text,
    e.page_path::text,
    e.target_type::text,
    e.target_id,
    e.properties,
    e.created_at
  from public.user_activity_events e
  join auth.users u on u.id = e.user_id
  left join public.profiles p on p.user_id = e.user_id
  where e.created_at >= v_since
    and (
      v_search = ''
      or lower(u.email) like '%' || v_search || '%'
      or lower(coalesce(p.name, '')) like '%' || v_search || '%'
      or lower(e.event_name) like '%' || v_search || '%'
      or lower(coalesce(e.page_path, '')) like '%' || v_search || '%'
    )
    and (
      v_event_name = ''
      or lower(e.event_name) = v_event_name
    )
  order by e.created_at desc
  limit greatest(least(coalesce(p_limit, 100), 500), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.log_user_activity_events(jsonb) from public;
revoke all on function public.upsert_user_activity_session(text, text, integer) from public;
revoke all on function public.admin_get_analytics_summary(integer) from public;
revoke all on function public.admin_list_member_activity(text, integer, integer, integer) from public;
revoke all on function public.admin_list_activity_events(text, text, integer, integer, integer) from public;

grant execute on function public.log_user_activity_events(jsonb) to authenticated;
grant execute on function public.upsert_user_activity_session(text, text, integer) to authenticated;
grant execute on function public.admin_get_analytics_summary(integer) to authenticated;
grant execute on function public.admin_list_member_activity(text, integer, integer, integer) to authenticated;
grant execute on function public.admin_list_activity_events(text, text, integer, integer, integer) to authenticated;
