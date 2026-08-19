-- Registration now collects real profile data and consent. Everything is
-- passed through Supabase Auth's signUp() `options.data` (stored on
-- auth.users.raw_user_meta_data) and copied into profiles by the existing
-- trigger -- one signup call, one atomic profile row, no second round trip.
-- Magic-link signups simply won't have this metadata, so every new column
-- is nullable and the trigger tolerates it being absent.
alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column address text,
  add column postal_code text,
  add column city text,
  add column phone text,
  add column terms_accepted_at timestamptz,
  add column marketing_consent boolean not null default false,
  add column marketing_consent_at timestamptz;

-- Consent must be provable later (who agreed, to what, when) -- timestamp
-- is set here, server-side, from the moment the row is created, not
-- trusted from client-supplied text.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  terms_accepted boolean := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);
  marketing_opt_in boolean := coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false);
begin
  insert into public.profiles (
    id, email, first_name, last_name, address, postal_code, city, phone,
    terms_accepted_at, marketing_consent, marketing_consent_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'postal_code',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'phone',
    case when terms_accepted then now() else null end,
    marketing_opt_in,
    case when marketing_opt_in then now() else null end
  );
  return new;
end;
$$;
