do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.reports drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.reports
  add constraint reports_type_check check (type in ('full-sjekk', 'skatteendring', 'komplett-sak'));

-- Concrete, trackable documentation gaps -- not just prose inside a report
-- snapshot. A gap can be tied to one claim or be case-wide (claim_id null).
-- Not append-only like assessments: "resolved" is a legitimate state
-- transition for a to-do-like item, not a fact that changes over time.
create table public.documentation_gaps (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete set null,
  description text not null,
  suggested_action text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.documentation_gaps enable row level security;

create policy "documentation_gaps_select_own"
  on public.documentation_gaps for select
  using (exists (select 1 from public.cases where cases.id = documentation_gaps.case_id and cases.user_id = auth.uid()));

create policy "documentation_gaps_insert_own"
  on public.documentation_gaps for insert
  with check (exists (select 1 from public.cases where cases.id = documentation_gaps.case_id and cases.user_id = auth.uid()));

create policy "documentation_gaps_update_own"
  on public.documentation_gaps for update
  using (exists (select 1 from public.cases where cases.id = documentation_gaps.case_id and cases.user_id = auth.uid()));

-- Adds the komplett-sak stage between skatteendring and utredning, and
-- renames utredning to strategisk-utredning so the stage vocabulary
-- matches the product_code vocabulary exactly (no Strategisk utredning
-- workbench exists yet, so this is a safe rename now rather than later).
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.cases'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%stage%'
  loop
    execute format('alter table public.cases drop constraint %I', con.conname);
  end loop;
end $$;

update public.cases set stage = 'strategisk-utredning' where stage = 'utredning';

alter table public.cases
  add constraint cases_stage_check
  check (stage in ('enkel-sjekk', 'full-sjekk', 'skatteendring', 'komplett-sak', 'strategisk-utredning'));
