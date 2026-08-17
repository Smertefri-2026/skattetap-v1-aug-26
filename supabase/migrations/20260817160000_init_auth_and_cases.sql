-- Profiles: one row per auth.users, queryable via RLS (auth.users itself is not).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Keep profiles in sync with new auth.users automatically.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cases: the root of the case workspace. tax_type/stage/status are closed
-- vocabularies on purpose -- the workflow only knows these values.
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  tax_period text,
  tax_type text not null default 'annet'
    check (tax_type in ('lonn', 'naering', 'formue', 'arv_gave', 'annet')),
  stage text not null default 'enkel-sjekk'
    check (stage in ('enkel-sjekk', 'full-sjekk', 'skatteendring', 'utredning')),
  status text not null default 'apen'
    check (status in ('apen', 'under_arbeid', 'fullfort', 'arkivert')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cases enable row level security;

create policy "cases_select_own"
  on public.cases for select
  using (user_id = auth.uid());

create policy "cases_insert_own"
  on public.cases for insert
  with check (user_id = auth.uid());

create policy "cases_update_own"
  on public.cases for update
  using (user_id = auth.uid());

create policy "cases_delete_own"
  on public.cases for delete
  using (user_id = auth.uid());

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cases_set_updated_at
  before update on public.cases
  for each row execute procedure public.set_updated_at();
