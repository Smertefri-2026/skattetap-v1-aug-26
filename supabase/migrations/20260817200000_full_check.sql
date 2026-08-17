-- Preserve the AI's original wording separately from the current
-- (possibly user-corrected) statement, per the Evidence Engine rule that a
-- correction must never overwrite the original extraction.
alter table public.claims
  add column ai_original_statement text;

-- Pluggable, structured tax rule reference. The AI is only ever allowed to
-- cite rule_code values that exist in this table -- never invent one.
create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  law_reference text not null,
  provision text not null,
  topic text not null,
  short_explanation text not null,
  sources jsonb not null default '[]'::jsonb,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now()
);

alter table public.tax_rules enable row level security;

create policy "tax_rules_select_authenticated"
  on public.tax_rules for select
  to authenticated
  using (true);

insert into public.tax_rules (rule_code, law_reference, provision, topic, short_explanation, sources) values
  ('reisefradrag-arbeid', 'Skatteloven', '§ 6-44', 'Reisefradrag',
   'Gir fradrag for kostnader til reise mellom hjem og fast arbeidssted utover en bunnbeløpsgrense, fastsatt etter avstand og antall reisedager.',
   '["https://lovdata.no/lov/1999-03-26-14/§6-44"]'::jsonb),
  ('minstefradrag-lonn', 'Skatteloven', '§ 6-30 til § 6-32', 'Minstefradrag',
   'Standardfradrag i lønnsinntekt som beregnes automatisk, med mindre faktiske kostnader gir høyere fradrag.',
   '["https://lovdata.no/lov/1999-03-26-14/§6-32"]'::jsonb),
  ('tap-aksjer', 'Skatteloven', '§ 9-4', 'Tap ved realisasjon av aksje',
   'Regulerer fradragsrett for tap ved realisasjon av aksjer og andre finansielle eiendeler utenfor fritaksmetoden.',
   '["https://lovdata.no/lov/1999-03-26-14/§9-4"]'::jsonb);

-- One row per generated Full sjekk report. Never overwritten -- a re-run
-- inserts a new version, matching the same pattern as case_assessments.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  type text not null check (type in ('full-sjekk')),
  content jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_select_own"
  on public.reports for select
  using (exists (select 1 from public.cases where cases.id = reports.case_id and cases.user_id = auth.uid()));

create policy "reports_insert_own"
  on public.reports for insert
  with check (exists (select 1 from public.cases where cases.id = reports.case_id and cases.user_id = auth.uid()));
