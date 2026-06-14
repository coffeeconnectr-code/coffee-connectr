-- Run in Supabase SQL Editor → New query → paste → Run

create table if not exists public.noticeboard_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  section text not null check (
    section in (
      'listings',
      'for_sale',
      'jobs',
      'news',
      'events',
      'green_coffee',
      'wanted',
      'wholesale',
      'premises',
      'collaborations',
      'services'
    )
  ),
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  primary_category text,
  secondary_categories text[] not null default '{}',
  location text,
  latitude double precision,
  longitude double precision,
  price_amount numeric(12, 2),
  price_currency text not null default 'USD',
  price_label text,
  photo_urls text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'sold', 'filled', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists noticeboard_posts_user_id_idx on public.noticeboard_posts (user_id);
create index if not exists noticeboard_posts_section_idx on public.noticeboard_posts (section);
create index if not exists noticeboard_posts_status_idx on public.noticeboard_posts (status);
create index if not exists noticeboard_posts_expires_at_idx on public.noticeboard_posts (expires_at desc);
create index if not exists noticeboard_posts_created_at_idx on public.noticeboard_posts (created_at desc);

drop trigger if exists noticeboard_posts_set_updated_at on public.noticeboard_posts;

create trigger noticeboard_posts_set_updated_at
before update on public.noticeboard_posts
for each row
execute function public.set_updated_at();

alter table public.noticeboard_posts enable row level security;

drop policy if exists "Active noticeboard posts are public" on public.noticeboard_posts;
create policy "Active noticeboard posts are public"
on public.noticeboard_posts
for select
to public
using (
  status in ('active', 'sold', 'filled')
  or auth.uid() = user_id
);

drop policy if exists "Members can create noticeboard posts" on public.noticeboard_posts;
create policy "Members can create noticeboard posts"
on public.noticeboard_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Members can update own noticeboard posts" on public.noticeboard_posts;
create policy "Members can update own noticeboard posts"
on public.noticeboard_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Members can delete own noticeboard posts" on public.noticeboard_posts;
create policy "Members can delete own noticeboard posts"
on public.noticeboard_posts
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('noticeboard-photos', 'noticeboard-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read noticeboard photos" on storage.objects;
create policy "Public read noticeboard photos"
on storage.objects
for select
to public
using (bucket_id = 'noticeboard-photos');

drop policy if exists "Members upload noticeboard photos" on storage.objects;
create policy "Members upload noticeboard photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'noticeboard-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members update own noticeboard photos" on storage.objects;
create policy "Members update own noticeboard photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'noticeboard-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members delete own noticeboard photos" on storage.objects;
create policy "Members delete own noticeboard photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'noticeboard-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
