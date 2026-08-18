do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.reports drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.reports
  add constraint reports_type_check
  check (type in ('full-sjekk', 'skatteendring', 'komplett-sak', 'strategisk-utredning'));

-- Structured, versioned, pluggable deadline rules -- deliberately separate
-- from tax_rules because a deadline needs a computable window (offset +
-- validity period) and a safety gate, not just a citation. quality_assured
-- defaults to false and is enforced by RLS itself (not just application
-- code) so an unreviewed rule can never leak into a computed deadline even
-- if a future code path forgets to filter for it. No rows are seeded here
-- on purpose -- the deadline engine must show "not assessed" until real
-- rules are entered and marked quality_assured by someone who has verified
-- them, never fall back to a guess.
create table public.tax_deadline_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  deadline_type text not null,
  description text not null,
  applies_to_tax_type text,
  months_after_period_end integer,
  exceptions jsonb not null default '[]'::jsonb,
  source text not null,
  valid_from date not null,
  valid_to date,
  quality_assured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tax_deadline_rules enable row level security;

create policy "tax_deadline_rules_select_assured"
  on public.tax_deadline_rules for select
  to authenticated
  using (quality_assured = true);
