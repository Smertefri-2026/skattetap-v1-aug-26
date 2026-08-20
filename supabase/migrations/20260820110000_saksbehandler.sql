-- Min saksbehandler: a per-case conversation with the AI case worker.
-- Deliberately generic table/column naming (conversations/messages, not
-- "skattetap_chat" or similar) -- this is meant to become a reusable Remøy
-- AI OS component, and a product-specific name here would be exactly the
-- kind of thing that has to be renamed and migrated later.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Set on assistant messages where the engine judged it could not answer
  -- responsibly from the case's actual data. Never true on user messages.
  needs_escalation boolean not null default false,
  created_at timestamptz not null default now()
);

-- Created when the user accepts an assistant message's offer to escalate.
-- Gated to cases with a paid entitlement at the application layer -- free
-- Enkel sjekk users can still chat, just can't escalate to a human.
create table public.support_escalations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Operational audit log for every AI engine call, across all future
-- engines, not just this one. Not user-facing -- no select policy for
-- regular users. Answers "which model/engine produced this, and when" the
-- day that question actually matters, instead of being unanswerable.
create table public.ai_call_log (
  id uuid primary key default gen_random_uuid(),
  engine text not null,
  model text not null,
  case_id uuid references public.cases (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  duration_ms integer not null,
  status text not null check (status in ('success', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.support_escalations enable row level security;
alter table public.ai_call_log enable row level security;

create policy "conversations_select_own"
  on public.conversations for select
  using (user_id = auth.uid());

create policy "conversations_insert_own"
  on public.conversations for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.cases where cases.id = case_id and cases.user_id = auth.uid())
  );

create policy "conversations_update_own"
  on public.conversations for update
  using (user_id = auth.uid());

create policy "messages_select_own"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id and conversations.user_id = auth.uid()
    )
  );

create policy "messages_insert_own"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id and conversations.user_id = auth.uid()
    )
  );

create policy "support_escalations_select_own"
  on public.support_escalations for select
  using (user_id = auth.uid());

create policy "support_escalations_insert_own"
  on public.support_escalations for insert
  with check (user_id = auth.uid());

-- ai_call_log: authenticated users may record their own calls, but there
-- is no select policy for the `authenticated` role, so nobody can read
-- this back except service_role -- it's an internal log, not a feature.
create policy "ai_call_log_insert_own"
  on public.ai_call_log for insert
  with check (user_id = auth.uid());

create index conversations_case_id_idx on public.conversations (case_id);
create index conversations_user_id_idx on public.conversations (user_id);
create index messages_conversation_id_idx on public.messages (conversation_id);
create index support_escalations_case_id_idx on public.support_escalations (case_id);
create index support_escalations_user_id_idx on public.support_escalations (user_id);
create index support_escalations_conversation_id_idx on public.support_escalations (conversation_id);
create index ai_call_log_case_id_idx on public.ai_call_log (case_id);
create index ai_call_log_user_id_idx on public.ai_call_log (user_id);
