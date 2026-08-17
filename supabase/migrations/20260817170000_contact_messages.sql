-- Contact form submissions. No RLS policies on purpose: anon and
-- authenticated users get zero access. Only the server-side service role
-- (contact API route, later the admin view) can read or write this table.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
