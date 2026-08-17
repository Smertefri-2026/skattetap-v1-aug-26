alter table public.cases
  add column amount_kr numeric,
  add column description text;

-- One row per Enkel sjekk run. Never overwritten -- a re-run inserts a new
-- row, so earlier AI assessments stay in history instead of being lost.
create table public.case_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  kind text not null check (kind in ('enkel-sjekk')),
  input jsonb not null,
  output jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.case_assessments enable row level security;

create policy "case_assessments_select_own"
  on public.case_assessments for select
  using (
    exists (
      select 1 from public.cases
      where cases.id = case_assessments.case_id
      and cases.user_id = auth.uid()
    )
  );

create policy "case_assessments_insert_own"
  on public.case_assessments for insert
  with check (
    exists (
      select 1 from public.cases
      where cases.id = case_assessments.case_id
      and cases.user_id = auth.uid()
    )
  );
