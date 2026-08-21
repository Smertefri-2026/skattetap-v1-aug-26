-- Fase B: tax_rules evolves into legal_sources (versioned, verifiable),
-- plus the legal_questions -> legal_analysis_runs -> {legal_question_sources,
-- legal_question_assessments} model. See the architecture rounds preceding
-- this migration for the full reasoning; this file implements the final,
-- corrected schema only.

-- === Kilden: tax_rules -> legal_sources ===
alter table public.tax_rules rename to legal_sources;
alter table public.legal_sources rename column rule_code to source_code;

alter table public.legal_sources
  add column source_type text not null default 'lov_forskrift'
    check (source_type in (
      'lov_forskrift', 'skatte_abc', 'skatteforvaltningshandboken',
      'skattedirektoratet_uttalelse', 'bindende_forhandsuttalelse',
      'skatteklagenemnda', 'rettspraksis', 'forarbeider', 'annet'
    )),
  add column citation text,
  add column published_date date,
  add column metadata jsonb not null default '{}'::jsonb,
  add column active boolean not null default true,
  -- Never defaults to verified -- a source is only usable by BM once a
  -- human has explicitly promoted it. Same quality-gate principle
  -- tax_deadline_rules.quality_assured already uses in this schema.
  add column verification_status text not null default 'needs_review'
    check (verification_status in ('verified', 'needs_review')),
  -- Versioning: a materially changed source is a NEW row, never an
  -- in-place edit. source_code is the stable logical identity shared
  -- across versions; (source_code, version) is the real unique key.
  add column version integer not null default 1;

-- law_reference/provision are meaningful for lov/forskrift, not for a dom,
-- uttalelse or BFU (which use citation/metadata instead).
alter table public.legal_sources
  alter column law_reference drop not null,
  alter column provision drop not null;

-- Verified, deterministic Postgres-assigned name for the original inline
-- "rule_code text not null unique" column constraint (confirmed against
-- the exact DDL in 20260817200000_full_check.sql; no later migration
-- touches this table before this one).
alter table public.legal_sources drop constraint tax_rules_rule_code_key;
alter table public.legal_sources add constraint legal_sources_code_version_key unique (source_code, version);

-- Exactly one active version per logical source at a time -- activating a
-- new version requires deactivating the old one in the same transaction,
-- enforced here, not just by convention.
create unique index legal_sources_one_active_version
  on public.legal_sources (source_code) where active;

-- The three existing rows were manually curated when tax_rules was first
-- seeded -- explicitly promoted here, not swept in by the new default.
update public.legal_sources set verification_status = 'verified';

alter policy "tax_rules_select_authenticated" on public.legal_sources
  rename to "legal_sources_select_authenticated";

-- === Rettsspørsmålet ===
create table public.legal_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  question text not null,
  -- Snapshot, not a live coupling -- lets us later answer "why was this
  -- question raised" even if the case's process stage has since moved on.
  case_stage_at_creation text,
  created_at timestamptz not null default now()
);

alter table public.legal_questions enable row level security;

create policy "legal_questions_select_own"
  on public.legal_questions for select
  using (exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid()));

create policy "legal_questions_insert_own"
  on public.legal_questions for insert
  with check (exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid()));

create table public.legal_question_claims (
  legal_question_id uuid not null references public.legal_questions (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  primary key (legal_question_id, claim_id)
);

alter table public.legal_question_claims enable row level security;

create policy "legal_question_claims_select_own"
  on public.legal_question_claims for select
  using (exists (
    select 1 from public.legal_questions
    where legal_questions.id = legal_question_claims.legal_question_id
    and exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid())
  ));

create policy "legal_question_claims_insert_own"
  on public.legal_question_claims for insert
  with check (exists (
    select 1 from public.legal_questions
    where legal_questions.id = legal_question_claims.legal_question_id
    and exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid())
  ));

-- === Revisjonssporet: én rad per sammenhengende analyse-omgang ===
create table public.legal_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  legal_question_id uuid not null references public.legal_questions (id) on delete cascade,
  -- Same vocabulary as ai_call_log.engine/model, not a foreign key to it --
  -- ai_call_log is explicitly best-effort (insert without a returned id,
  -- failures swallowed), too fragile to hang traceability on.
  engine text not null,
  model text not null,
  prompt_version text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.legal_analysis_runs enable row level security;

create policy "legal_analysis_runs_select_own"
  on public.legal_analysis_runs for select
  using (exists (
    select 1 from public.legal_questions
    where legal_questions.id = legal_analysis_runs.legal_question_id
    and exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid())
  ));

create policy "legal_analysis_runs_insert_own"
  on public.legal_analysis_runs for insert
  with check (exists (
    select 1 from public.legal_questions
    where legal_questions.id = legal_analysis_runs.legal_question_id
    and exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid())
  ));

create policy "legal_analysis_runs_update_own"
  on public.legal_analysis_runs for update
  using (exists (
    select 1 from public.legal_questions
    where legal_questions.id = legal_analysis_runs.legal_question_id
    and exists (select 1 from public.cases where cases.id = legal_questions.case_id and cases.user_id = auth.uid())
  ));

-- === "RETTSKILDEN SIER" -- child of the RUN, not of the question directly ===
-- (no legal_question_id here on purpose: it's reachable via
-- legal_analysis_run_id -> legal_analysis_runs.legal_question_id, one
-- join, so a child row can never disagree with its own run about which
-- question it belongs to.)
create table public.legal_question_sources (
  id uuid primary key default gen_random_uuid(),
  legal_analysis_run_id uuid not null references public.legal_analysis_runs (id) on delete cascade,
  legal_source_id uuid not null references public.legal_sources (id) on delete restrict,
  locator_type text check (locator_type in ('paragraf', 'ledd', 'avsnitt', 'punkt', 'kapittel', 'annet')),
  locator_value text,
  -- BM's OWN controlled characterization -- never a claimed direct quote.
  -- citation + locator + legal_sources.source_url is always where a human
  -- can actually go verify what the source says.
  bm_summary text not null,
  relevance_reasoning text not null,
  supports text not null check (supports in ('kunden', 'skatteetaten', 'noytral', 'uklar')),
  created_at timestamptz not null default now()
);

alter table public.legal_question_sources enable row level security;

create policy "legal_question_sources_select_own"
  on public.legal_question_sources for select
  using (exists (
    select 1 from public.legal_analysis_runs run
    join public.legal_questions lq on lq.id = run.legal_question_id
    where run.id = legal_question_sources.legal_analysis_run_id
    and exists (select 1 from public.cases where cases.id = lq.case_id and cases.user_id = auth.uid())
  ));

create policy "legal_question_sources_insert_own"
  on public.legal_question_sources for insert
  with check (exists (
    select 1 from public.legal_analysis_runs run
    join public.legal_questions lq on lq.id = run.legal_question_id
    where run.id = legal_question_sources.legal_analysis_run_id
    and exists (select 1 from public.cases where cases.id = lq.case_id and cases.user_id = auth.uid())
  ));

-- === "BEVISMOTORENS VURDERING" -- nøyaktig én per run, håndhevet i DB ===
create table public.legal_question_assessments (
  id uuid primary key default gen_random_uuid(),
  legal_analysis_run_id uuid not null unique references public.legal_analysis_runs (id) on delete cascade,
  our_assessment text not null,
  created_at timestamptz not null default now()
);

alter table public.legal_question_assessments enable row level security;

create policy "legal_question_assessments_select_own"
  on public.legal_question_assessments for select
  using (exists (
    select 1 from public.legal_analysis_runs run
    join public.legal_questions lq on lq.id = run.legal_question_id
    where run.id = legal_question_assessments.legal_analysis_run_id
    and exists (select 1 from public.cases where cases.id = lq.case_id and cases.user_id = auth.uid())
  ));

create policy "legal_question_assessments_insert_own"
  on public.legal_question_assessments for insert
  with check (exists (
    select 1 from public.legal_analysis_runs run
    join public.legal_questions lq on lq.id = run.legal_question_id
    where run.id = legal_question_assessments.legal_analysis_run_id
    and exists (select 1 from public.cases where cases.id = lq.case_id and cases.user_id = auth.uid())
  ));

create index legal_questions_case_idx on public.legal_questions (case_id);
create index legal_analysis_runs_question_idx on public.legal_analysis_runs (legal_question_id);
create index legal_question_sources_run_idx on public.legal_question_sources (legal_analysis_run_id);
create index legal_question_sources_source_idx on public.legal_question_sources (legal_source_id);
