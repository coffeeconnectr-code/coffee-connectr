-- Run in Supabase SQL Editor → New query → paste → Run
-- ORDER: Run AFTER profiles.sql, admin.sql, and subscriptions.sql
--
-- Digital tools & resources: members can share links and upload documents.

create table if not exists public.resource_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  post_type text not null check (post_type in ('document', 'link')),
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  topic text not null,
  external_url text,
  document_url text,
  file_name text,
  file_size integer,
  status text not null default 'active' check (status in ('active', 'archived')),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_posts_link_has_url check (
    post_type != 'link' or (external_url is not null and char_length(trim(external_url)) > 0)
  ),
  constraint resource_posts_document_has_file check (
    post_type != 'document' or (document_url is not null and char_length(trim(document_url)) > 0)
  )
);

create index if not exists resource_posts_user_id_idx on public.resource_posts (user_id);
create index if not exists resource_posts_post_type_idx on public.resource_posts (post_type);
create index if not exists resource_posts_topic_idx on public.resource_posts (topic);
create index if not exists resource_posts_status_idx on public.resource_posts (status);
create index if not exists resource_posts_created_at_idx on public.resource_posts (created_at desc);

drop trigger if exists resource_posts_set_updated_at on public.resource_posts;

create trigger resource_posts_set_updated_at
before update on public.resource_posts
for each row
execute function public.set_updated_at();

create or replace function public.protect_resource_hidden_field()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.is_hidden := false;
    return new;
  end if;

  if auth.uid() = new.user_id and not public.is_current_user_admin() then
    new.is_hidden := old.is_hidden;
  end if;

  return new;
end;
$$;

drop trigger if exists resource_posts_protect_hidden on public.resource_posts;

create trigger resource_posts_protect_hidden
before insert or update on public.resource_posts
for each row
execute function public.protect_resource_hidden_field();

alter table public.resource_posts enable row level security;

drop policy if exists "Active resources are public" on public.resource_posts;
create policy "Active resources are public"
on public.resource_posts
for select
to public
using (
  (status = 'active' and not is_hidden)
  or auth.uid() = user_id
);

drop policy if exists "Admins can view all resources" on public.resource_posts;
create policy "Admins can view all resources"
on public.resource_posts
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "Members can create resources" on public.resource_posts;
create policy "Members can create resources"
on public.resource_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
);

drop policy if exists "Members can update own resources" on public.resource_posts;
create policy "Members can update own resources"
on public.resource_posts
for update
to authenticated
using (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
)
with check (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
);

drop policy if exists "Members can delete own resources" on public.resource_posts;
create policy "Members can delete own resources"
on public.resource_posts
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('resource-documents', 'resource-documents', true)
on conflict (id) do nothing;

drop policy if exists "Public read resource documents" on storage.objects;
create policy "Public read resource documents"
on storage.objects
for select
to public
using (bucket_id = 'resource-documents');

drop policy if exists "Members upload resource documents" on storage.objects;
create policy "Members upload resource documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resource-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members update own resource documents" on storage.objects;
create policy "Members update own resource documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resource-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members delete own resource documents" on storage.objects;
create policy "Members delete own resource documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resource-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
