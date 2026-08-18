-- Needed to compute "what changed since the last analysis" deterministically:
-- without a resolved_at timestamp there's no way to tell whether a gap
-- created before the previous report was resolved before or after it.
alter table public.documentation_gaps
  add column resolved_at timestamptz;
