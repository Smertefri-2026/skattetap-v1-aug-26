-- Pluggable product catalog. Adding a new tier later is a row, not an
-- architecture change -- sort_order is what makes tier-inheritance and
-- upgrade-difference pricing work generically for any number of tiers.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  name text not null,
  price_kr integer not null,
  sort_order integer not null unique,
  stripe_product_id text,
  stripe_price_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Pricing is public marketing information -- readable by anyone, including
-- anonymous visitors on /priser.
create policy "products_select_all"
  on public.products for select
  using (true);

insert into public.products (product_code, name, price_kr, sort_order) values
  ('full-sjekk', 'Full sjekk', 599, 1),
  ('skatteendring', 'Skatteendring', 1490, 2),
  ('komplett-sak', 'Komplett sak', 9990, 3),
  ('strategisk-utredning', 'Strategisk utredning', 24990, 4);

-- Purchase history. Multiple legitimate purchases per case over time are
-- expected (upgrades), so this is append-only -- never overwritten.
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_code text not null references public.products (product_code),
  amount_kr integer not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'canceled', 'refunded')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.purchases enable row level security;

create policy "purchases_select_own"
  on public.purchases for select
  using (user_id = auth.uid());

create policy "purchases_insert_own"
  on public.purchases for insert
  with check (user_id = auth.uid());

-- No update policy for the authenticated role on purpose: only the
-- service-role webhook may transition a purchase to completed/failed.

-- Current entitlement. Never created by the client -- only a
-- signature-verified Stripe webhook (service role) may insert a row here.
create table public.case_access (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  product_code text not null references public.products (product_code),
  purchase_id uuid references public.purchases (id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (case_id, product_code)
);

alter table public.case_access enable row level security;

create policy "case_access_select_own"
  on public.case_access for select
  using (exists (select 1 from public.cases where cases.id = case_access.case_id and cases.user_id = auth.uid()));
