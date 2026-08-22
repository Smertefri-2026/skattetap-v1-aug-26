-- Product capacity: one central place for how much a product includes,
-- instead of limits hardcoded in UI/backend. product_type distinguishes a
-- normal tier (unlocks a workbench, case_access-gated, tier-inheritance via
-- sort_order) from a capacity add-on (adds document/MB room to whatever
-- tier a case already has -- never unlocks a workbench itself, and must be
-- purchasable more than once, which is exactly why it is NOT modeled as
-- another case_access row -- see case_capacity_purchases below).
alter table public.products
  add column product_type text not null default 'tier' check (product_type in ('tier', 'capacity_addon')),
  add column max_documents integer,
  add column max_total_mb integer,
  add column addon_documents integer,
  add column addon_total_mb integer;

-- Starting values, per the approved "foreløpig utgangspunkt" -- adjustable
-- in the database later, never hardcoded per-file.
update public.products set max_documents = 10, max_total_mb = 50 where product_code = 'full-sjekk';
update public.products set max_documents = 15, max_total_mb = 75 where product_code = 'skatteendring';
update public.products set max_documents = 25, max_total_mb = 150 where product_code = 'komplett-sak';
update public.products set max_documents = 50, max_total_mb = 300 where product_code = 'strategisk-utredning';

-- Enkel sjekk never goes through case_access (it's free, never sold via
-- Stripe) -- but its capacity numbers belong in the same single table as
-- every other tier's, not hardcoded as a fallback constant in code.
-- sort_order 0 keeps it first without colliding with the existing 1-4.
insert into public.products (product_code, name, price_kr, sort_order, product_type, max_documents, max_total_mb, active)
values ('enkel-sjekk', 'Enkel sjekk', 0, 0, 'tier', 3, 15, true);

-- Capacity add-on purchases. Deliberately NOT case_access: case_access has
-- unique(case_id, product_code) with ignoreDuplicates on grant, which is
-- correct for a tier (never re-granted) but wrong for an add-on, which
-- must be purchasable multiple times on the same case and accumulate.
-- Effective extra capacity for a case = sum of addon_documents/
-- addon_total_mb across every row here for that case.
create table public.case_capacity_purchases (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  product_code text not null references public.products (product_code),
  purchase_id uuid references public.purchases (id) on delete set null,
  granted_at timestamptz not null default now()
);

alter table public.case_capacity_purchases enable row level security;

create policy "case_capacity_purchases_select_own"
  on public.case_capacity_purchases for select
  using (exists (select 1 from public.cases where cases.id = case_capacity_purchases.case_id and cases.user_id = auth.uid()));

-- No insert policy for the authenticated role, on purpose -- same as
-- case_access: only the signature-verified Stripe webhook (service role)
-- may grant capacity.
