-- Levende saksbilde -- dokumentmotor. `ai_extraction` (existing) is the
-- raw, single-document extraction (type/date/parties/amounts/facts) with
-- no awareness of the rest of the case. `case_analysis` is the second,
-- case-context-aware pass: how this document relates to everything else
-- already known about the case -- credibility, gaps specific to this
-- document, what to fetch next, and which other documents it connects to.
-- Kept as a separate column rather than folded into ai_extraction because
-- the two passes have genuinely different inputs (one document vs. the
-- whole case) and the second pass is meant to be safely re-run later as
-- the case grows, without re-doing the first.
alter table public.documents
  add column case_analysis jsonb;
