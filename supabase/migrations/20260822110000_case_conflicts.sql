-- First-class conflict entity: a specific claim-vs-claim contradiction the
-- Evidence Engine detected, stored with the AI's own suggestion for how the
-- user can clarify it. Previously conflicts were only derived on the fly
-- from claim_assessments + evidence_links, which could only approximate
-- which claim was the actual counter-statement (first claim from the
-- contradicting document). Storing the exact pair at detection time (in
-- runDocumentCaseAnalysis, which already knows both claims precisely) gives
-- the conflict workspace a stable row to resolve, reopen, or mark unclear --
-- and claim_assessments stays append-only throughout: resolving a conflict
-- adds new assessment rows, it never rewrites the ones already there.
create table public.case_conflicts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  claim_a_id uuid not null references public.claims (id) on delete cascade,
  claim_b_id uuid not null references public.claims (id) on delete cascade,
  reasoning text not null,
  clarifying_question text not null,
  recommended_document text,
  status text not null default 'open' check (status in ('open', 'resolved', 'marked_unclear')),
  resolved_claim_id uuid references public.claims (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.case_conflicts enable row level security;

create policy "case_conflicts_select_own"
  on public.case_conflicts for select
  using (exists (select 1 from public.cases where cases.id = case_conflicts.case_id and cases.user_id = auth.uid()));

create policy "case_conflicts_insert_own"
  on public.case_conflicts for insert
  with check (exists (select 1 from public.cases where cases.id = case_conflicts.case_id and cases.user_id = auth.uid()));

create policy "case_conflicts_update_own"
  on public.case_conflicts for update
  using (exists (select 1 from public.cases where cases.id = case_conflicts.case_id and cases.user_id = auth.uid()));

create index case_conflicts_case_id_idx on public.case_conflicts (case_id);
create index case_conflicts_claim_a_id_idx on public.case_conflicts (claim_a_id);
create index case_conflicts_claim_b_id_idx on public.case_conflicts (claim_b_id);
