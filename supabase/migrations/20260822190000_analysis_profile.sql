-- Analysis profile per product tier -- a named level, not a bare boolean,
-- so later differentiation (e.g. a deeper legal-analysis level for
-- Komplett sak/Strategisk utredning) is a new allowed value here, not a
-- new column. Only one distinction exists today: whether
-- runDocumentCaseAnalysis (cross-document conflicts/gaps/credibility)
-- runs at all. Per-document fact extraction and legal question/source
-- analysis run at every profile, including 'basic'.
alter table public.products
  add column analysis_profile text not null default 'standard' check (analysis_profile in ('basic', 'standard'));

update public.products set analysis_profile = 'basic' where product_code = 'enkel-sjekk';
