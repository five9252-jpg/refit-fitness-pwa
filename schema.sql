-- Refit MVP cloud storage: run in Supabase SQL Editor after creating a project.
-- Never disable RLS and never place a service_role key in browser code.

create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_version text not null,
  basic_data_accepted boolean not null,
  exercise_data_accepted boolean not null,
  accepted_at timestamptz not null default now(),
  operator_name text not null,
  contact_email text not null,
  retention_text text not null
);

alter table public.user_app_data enable row level security;
alter table public.admin_memberships enable row level security;
alter table public.consent_events enable row level security;

revoke all on public.user_app_data, public.admin_memberships, public.consent_events from anon, authenticated, public;
grant select, insert, update, delete on public.user_app_data to authenticated;
grant select on public.admin_memberships to authenticated;
grant select, insert on public.consent_events to authenticated;

drop policy if exists "users read their app data" on public.user_app_data;
create policy "users read their app data" on public.user_app_data
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users insert their app data" on public.user_app_data;
create policy "users insert their app data" on public.user_app_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users update their app data" on public.user_app_data;
create policy "users update their app data" on public.user_app_data
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "users delete their app data" on public.user_app_data;
create policy "users delete their app data" on public.user_app_data
  for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "admins read all app data" on public.user_app_data;
create policy "admins read all app data" on public.user_app_data
  for select to authenticated using (
    exists (select 1 from public.admin_memberships m where m.user_id = (select auth.uid()))
  );

drop policy if exists "users read own admin membership" on public.admin_memberships;
create policy "users read own admin membership" on public.admin_memberships
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "users read own consent events" on public.consent_events;
create policy "users read own consent events" on public.consent_events
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users record own consent events" on public.consent_events;
create policy "users record own consent events" on public.consent_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "admins read consent events" on public.consent_events;
create policy "admins read consent events" on public.consent_events
  for select to authenticated using (
    exists (select 1 from public.admin_memberships m where m.user_id = (select auth.uid()))
  );

-- After the operator has registered and verified their email, replace the address
-- below and run this statement manually in SQL Editor. Never let users self-assign admin.
-- insert into public.admin_memberships (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
-- on conflict (user_id) do nothing;
