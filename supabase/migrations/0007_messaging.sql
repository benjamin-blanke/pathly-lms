-- Internal messaging — org-scoped 1:1 and group conversations.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  is_group boolean not null default false,
  title text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index conversations_org_id_idx on public.conversations (org_id);

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index conversation_participants_conversation_id_idx on public.conversation_participants (conversation_id);
create index conversation_participants_user_id_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id);

create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = target_conversation_id and user_id = auth.uid()
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_participant" on public.conversations
  for select to authenticated using (public.is_conversation_participant(id));

create policy "conversations_insert_org_member" on public.conversations
  for insert to authenticated
  with check (org_id = public.current_org_id() and created_by = auth.uid());

create policy "conversation_participants_select" on public.conversation_participants
  for select to authenticated
  using (user_id = auth.uid() or public.is_conversation_participant(conversation_id));

create policy "conversation_participants_insert" on public.conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
    or public.is_conversation_participant(conversation_id)
  );

create policy "conversation_participants_update_self" on public.conversation_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages_select_participant" on public.messages
  for select to authenticated using (public.is_conversation_participant(conversation_id));

create policy "messages_insert_participant" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));
