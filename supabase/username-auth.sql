-- Run after schema.sql. User IDs continue to reference auth.users, so existing
-- exercise, diet, trainer and consent records remain attached to the same UUID.
create table if not exists public.account_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{3,19}$'),
  created_at timestamptz not null default now()
);
alter table public.account_usernames enable row level security;
revoke all on public.account_usernames from public, anon, authenticated;
grant select on public.account_usernames to authenticated;
grant select on public.account_usernames to service_role;
drop policy if exists "read own login id" on public.account_usernames;
create policy "read own login id" on public.account_usernames
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.reserve_signup_username()
returns trigger language plpgsql security definer set search_path = '' as $$
declare proposed text := lower(btrim(new.raw_user_meta_data ->> 'pacefit_username'));
begin
  if proposed is not null and proposed <> '' then
    if proposed !~ '^[a-z][a-z0-9_]{3,19}$' then
      raise exception 'Invalid login ID';
    end if;
    insert into public.account_usernames (user_id, username) values (new.id, proposed);
  end if;
  return new;
end;
$$;
drop trigger if exists reserve_signup_username on auth.users;
create trigger reserve_signup_username after insert on auth.users
  for each row execute function public.reserve_signup_username();

-- Existing verified accounts can add a login ID after signing in by email once.
create or replace function public.claim_login_id(proposed text)
returns text language plpgsql security definer set search_path = '' as $$
declare clean text := lower(btrim(proposed));
declare account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Login required'; end if;
  if clean is null or clean !~ '^[a-z][a-z0-9_]{3,19}$' then
    raise exception 'Invalid login ID';
  end if;
  if not exists (select 1 from auth.users u where u.id = account_id and u.email_confirmed_at is not null) then
    raise exception 'Verified email required';
  end if;
  insert into public.account_usernames (user_id, username) values (account_id, clean)
    on conflict (user_id) do nothing;
  return (select username from public.account_usernames where user_id = account_id);
end;
$$;
revoke all on function public.claim_login_id(text) from public, anon;
grant execute on function public.claim_login_id(text) to authenticated;

create or replace function public.login_id_available(proposed text)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(btrim(proposed)) ~ '^[a-z][a-z0-9_]{3,19}$'
    and not exists (select 1 from public.account_usernames where username = lower(btrim(proposed)))
$$;
revoke all on function public.login_id_available(text) from public;
grant execute on function public.login_id_available(text) to anon, authenticated;

-- Edge Function only. Anonymous clients cannot read username-to-account mappings.
create table if not exists public.username_login_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
create index if not exists username_login_limits_window_idx on public.username_login_limits (window_started_at);
alter table public.username_login_limits enable row level security;
revoke all on public.username_login_limits from public, anon, authenticated;

create or replace function public.allow_username_login(key_value text, max_attempts integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_attempts integer;
begin
  if key_value !~ '^[0-9a-f]{64}$' or max_attempts < 1 or max_attempts > 100 then return false; end if;
  delete from public.username_login_limits where window_started_at < now() - interval '1 day';
  insert into public.username_login_limits (key_hash, window_started_at, attempts)
    values (key_value, now(), 1)
  on conflict (key_hash) do update set
    window_started_at = case when public.username_login_limits.window_started_at < now() - interval '15 minutes'
      then now() else public.username_login_limits.window_started_at end,
    attempts = case when public.username_login_limits.window_started_at < now() - interval '15 minutes'
      then 1 else public.username_login_limits.attempts + 1 end
  returning attempts into current_attempts;
  return current_attempts <= max_attempts;
end;
$$;
revoke all on function public.allow_username_login(text, integer) from public, anon, authenticated;
grant execute on function public.allow_username_login(text, integer) to service_role;

-- A small authenticated lookup for the account screen; no other user's ID is exposed.
create or replace function public.my_login_id()
returns text language sql stable security definer set search_path = '' as $$
  select username from public.account_usernames where user_id = (select auth.uid())
$$;
revoke all on function public.my_login_id() from public, anon;
grant execute on function public.my_login_id() to authenticated;
