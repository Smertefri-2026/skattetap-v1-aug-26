-- Min saksbehandler can now point directly at specific parts of the case
-- (a document, a conflict, a gap, a report, a timeline entry) instead of
-- only describing them in prose. The resolved {type, label, href} list is
-- computed once in sendMessage() from the same context the model saw, and
-- stored alongside the message so a reloaded conversation renders the same
-- clickable references without re-deriving them. Named reference_links, not
-- "references" -- that's a reserved SQL keyword and would need quoting
-- everywhere it's touched.
alter table public.messages
  add column reference_links jsonb;
