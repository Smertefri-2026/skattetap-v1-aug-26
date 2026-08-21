-- Dedicated refund-request tracking, replacing the contact_messages
-- workaround from the Min side follow-up round. purchase_id is required
-- (a refund request is always about one purchase); case_id is nullable
-- and set-null on delete since a case can now be permanently deleted
-- (see 20260822150000) while the purchase and its refund history stay.
create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  case_id uuid references public.cases (id) on delete set null,
  reason text,
  status text not null default 'open'
    check (status in ('open', 'processing', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_id)
);

alter table public.refund_requests enable row level security;

-- Customers can see and create their own requests. No update/delete
-- policy for the authenticated role on purpose -- only admin, through
-- the service-role client (same pattern as support_escalations and
-- contact_messages), can change status or add admin_note.
create policy "refund_requests_select_own"
  on public.refund_requests for select
  using (user_id = auth.uid());

create policy "refund_requests_insert_own"
  on public.refund_requests for insert
  with check (user_id = auth.uid());

create trigger refund_requests_set_updated_at
  before update on public.refund_requests
  for each row execute procedure public.set_updated_at();
