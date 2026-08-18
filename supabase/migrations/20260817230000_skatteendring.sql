-- Reports already models "one append-only generated document per case,
-- versioned, structured content is the source of truth for web + PDF" --
-- exactly what a Skatteendring proposal is too, so it's a new `type`
-- value on the same table rather than a parallel table.
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
  add constraint reports_type_check check (type in ('full-sjekk', 'skatteendring'));

-- One row per uploaded Skatteetaten response. Append-only -- a case can
-- receive more than one response over time, and each interpretation is
-- kept, never overwritten by the next.
create table public.skatteetaten_responses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  interpretation jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.skatteetaten_responses enable row level security;

create policy "skatteetaten_responses_select_own"
  on public.skatteetaten_responses for select
  using (exists (select 1 from public.cases where cases.id = skatteetaten_responses.case_id and cases.user_id = auth.uid()));

create policy "skatteetaten_responses_insert_own"
  on public.skatteetaten_responses for insert
  with check (exists (select 1 from public.cases where cases.id = skatteetaten_responses.case_id and cases.user_id = auth.uid()));

-- Outcome tracking from day one, per case. Not surfaced in the product UI
-- yet -- this is purely data collection so future statistics ("X% of
-- Skatteendring cases get medhold") don't need to be reconstructed
-- retroactively. Deliberately a closed, extensible vocabulary rather than
-- free text, so aggregation stays meaningful as more values are added.
alter table public.cases
  add column outcome text not null default 'ukjent'
  check (outcome in ('ukjent', 'medhold', 'delvis_medhold', 'avslag', 'trukket_avsluttet'));
