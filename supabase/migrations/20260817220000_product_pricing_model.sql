-- Makes room for a future Skattetap+ subscription without reworking the
-- catalog later. scope tells the checkout flow (and, later, the webhook)
-- whether a purchase grants access to one case (case_access) or the whole
-- account (a future account-scoped entitlement table, not built yet since
-- no recurring product exists to sell -- but nothing here would need to
-- change when that table is added).
alter table public.products
  add column price_type text not null default 'one_time' check (price_type in ('one_time', 'recurring')),
  add column billing_interval text check (billing_interval in ('month', 'year')),
  add column scope text not null default 'case' check (scope in ('case', 'account'));

alter table public.products
  add constraint recurring_products_have_interval
  check (price_type = 'one_time' or billing_interval is not null);
