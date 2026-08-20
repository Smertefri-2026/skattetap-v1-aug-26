-- Admin/CRM access. Deliberately a separate table, not a boolean column on
-- profiles or an email allowlist in code -- a real table gives service-role
-- an auditable place to grant/revoke access, and a normal RLS select
-- policy lets a logged-in user check only their OWN membership (requireAdmin
-- reads this the same way requireUser reads auth.getUser()). No insert
-- policy for the authenticated role: admins are granted by service_role
-- only, never by the app itself.
--
-- Admin pages read case/user/purchase/escalation data through the
-- service-role client (lib/supabase/admin.ts), not through per-table RLS
-- bypass policies -- requireAdmin() is the one security boundary, checked
-- with the caller's own session against this table before any
-- service-role query runs. That keeps this migration to one table instead
-- of an admin-bypass policy sprinkled across every case-related table.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "admin_users_select_own"
  on public.admin_users for select
  using (user_id = auth.uid());

-- Seeds the first admin from the account already building this product --
-- every subsequent grant happens by inserting into this table directly
-- (service_role/SQL), not through the app.
insert into public.admin_users (user_id)
select id from auth.users where email = 'oystein.remoy@gmail.com'
on conflict do nothing;
