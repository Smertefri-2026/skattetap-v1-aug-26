insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Storage paths are always "<case_id>/<filename>", so ownership is checked
-- by looking up the case that the first path segment belongs to.
create policy "documents_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases
      where cases.id::text = (storage.foldername(name))[1]
      and cases.user_id = auth.uid()
    )
  );

create policy "documents_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases
      where cases.id::text = (storage.foldername(name))[1]
      and cases.user_id = auth.uid()
    )
  );

create policy "documents_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases
      where cases.id::text = (storage.foldername(name))[1]
      and cases.user_id = auth.uid()
    )
  );

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'extracting', 'done', 'failed')),
  extracted_text text,
  ai_extraction jsonb,
  rejection_reason text,
  uploaded_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_select_own"
  on public.documents for select
  using (exists (select 1 from public.cases where cases.id = documents.case_id and cases.user_id = auth.uid()));

create policy "documents_insert_own"
  on public.documents for insert
  with check (exists (select 1 from public.cases where cases.id = documents.case_id and cases.user_id = auth.uid()));

create policy "documents_update_own"
  on public.documents for update
  using (exists (select 1 from public.cases where cases.id = documents.case_id and cases.user_id = auth.uid()));

create policy "documents_delete_own"
  on public.documents for delete
  using (exists (select 1 from public.cases where cases.id = documents.case_id and cases.user_id = auth.uid()));

-- Claim = the statement itself. Its current documentation status is never
-- stored here -- it lives in claim_assessments, which is append-only, so a
-- claim's status can evolve without losing earlier assessments.
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  statement text not null,
  origin text not null check (origin in ('user', 'ai_suggested')),
  source_document_id uuid references public.documents (id) on delete set null,
  confirmed_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.claims enable row level security;

create policy "claims_select_own"
  on public.claims for select
  using (exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid()));

create policy "claims_insert_own"
  on public.claims for insert
  with check (exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid()));

create policy "claims_update_own"
  on public.claims for update
  using (exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid()));

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute procedure public.set_updated_at();

-- The relationship between one claim and one piece of evidence.
create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  relationship text not null check (relationship in ('supports', 'contradicts', 'mentions')),
  created_at timestamptz not null default now()
);

alter table public.evidence_links enable row level security;

create policy "evidence_links_select_own"
  on public.evidence_links for select
  using (exists (select 1 from public.claims where claims.id = evidence_links.claim_id
    and exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid())));

create policy "evidence_links_insert_own"
  on public.evidence_links for insert
  with check (exists (select 1 from public.claims where claims.id = evidence_links.claim_id
    and exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid())));

-- Versioned. A re-assessment inserts a new row -- it never overwrites an
-- earlier one, so the claim's assessment history is never lost.
create table public.claim_assessments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  status text not null check (status in ('documented', 'undocumented', 'conflicting')),
  reasoning text not null,
  assessed_by text not null check (assessed_by in ('system', 'ai')),
  created_at timestamptz not null default now()
);

alter table public.claim_assessments enable row level security;

create policy "claim_assessments_select_own"
  on public.claim_assessments for select
  using (exists (select 1 from public.claims where claims.id = claim_assessments.claim_id
    and exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid())));

create policy "claim_assessments_insert_own"
  on public.claim_assessments for insert
  with check (exists (select 1 from public.claims where claims.id = claim_assessments.claim_id
    and exists (select 1 from public.cases where cases.id = claims.case_id and cases.user_id = auth.uid())));
