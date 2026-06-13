-- Run in Supabase SQL Editor → New query → paste → Run

-- 1. Messages table (direct messages between two members)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users (id) on delete cascade not null,
  recipient_id uuid references auth.users (id) on delete cascade not null,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_recipient_id_idx on public.messages (recipient_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- 2. Row Level Security
alter table public.messages enable row level security;

drop policy if exists "Users can read own messages" on public.messages;
create policy "Users can read own messages"
on public.messages
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
on public.messages
for insert
to authenticated
with check (auth.uid() = sender_id and sender_id <> recipient_id);

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
on public.messages
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- 3. Realtime (so new messages appear without refreshing)
alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
