-- Every RLS policy in this project checks ownership through a case_id or
-- user_id column (directly, or via an `exists (select ... from cases ...)`
-- subquery), and every foreign key join does the same. None of these
-- columns had a supporting index -- invisible at today's scale, a real
-- sequential-scan cost once there are thousands of cases. Indexing now,
-- before volume, rather than diagnosing it under load later.
create index if not exists cases_user_id_idx on public.cases (user_id);

create index if not exists case_assessments_case_id_idx on public.case_assessments (case_id);

create index if not exists documents_case_id_idx on public.documents (case_id);

create index if not exists claims_case_id_idx on public.claims (case_id);
create index if not exists claims_source_document_id_idx on public.claims (source_document_id);

create index if not exists evidence_links_claim_id_idx on public.evidence_links (claim_id);
create index if not exists evidence_links_document_id_idx on public.evidence_links (document_id);

create index if not exists claim_assessments_claim_id_idx on public.claim_assessments (claim_id);

create index if not exists reports_case_id_idx on public.reports (case_id);

create index if not exists documentation_gaps_case_id_idx on public.documentation_gaps (case_id);
create index if not exists documentation_gaps_claim_id_idx on public.documentation_gaps (claim_id);

create index if not exists purchases_case_id_idx on public.purchases (case_id);
create index if not exists purchases_user_id_idx on public.purchases (user_id);

create index if not exists case_access_case_id_idx on public.case_access (case_id);
create index if not exists case_access_purchase_id_idx on public.case_access (purchase_id);

create index if not exists skatteetaten_responses_case_id_idx on public.skatteetaten_responses (case_id);
create index if not exists skatteetaten_responses_document_id_idx on public.skatteetaten_responses (document_id);
