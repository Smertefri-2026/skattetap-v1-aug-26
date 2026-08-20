-- Documentation gaps become an operative worklist rather than a flat list:
-- why each gap matters, a concrete document to fetch, and (when a specific
-- document raised the gap) which one, so the user can act on each row
-- instead of just reading it.
alter table public.documentation_gaps
  add column importance text,
  add column recommended_document text,
  add column source_document_id uuid references public.documents (id) on delete set null;

create index documentation_gaps_source_document_id_idx
  on public.documentation_gaps (source_document_id);

-- "Neste anbefalte handling" -- current-state fields on the case itself,
-- same pattern as documents.case_analysis: recomputed and overwritten at
-- the points the case actually changes (new document analyzed, gap
-- resolved/reopened, claim confirmed/corrected/added), not versioned
-- history, since only the current recommendation is ever meaningful.
alter table public.cases
  add column next_action text,
  add column next_action_reasoning text,
  add column next_action_type text
    check (next_action_type in (
      'upload_document', 'resolve_conflict', 'generate_report',
      'purchase_upgrade', 'talk_to_advisor', 'provide_information'
    )),
  add column next_action_computed_at timestamptz;
