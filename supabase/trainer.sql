-- Run after schema.sql. This file adds member/trainer sharing and an audit trail.
-- A trainer code only starts a member-approved link. It never grants access alone.

create table if not exists public.trainer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  created_at timestamptz not null default now()
);

create table if not exists public.trainer_member_links (
  trainer_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  can_write boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trainer_id, member_id),
  check (trainer_id <> member_id)
);

create table if not exists public.trainer_log_entries (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(user_id),
  member_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null check (entry_date <= current_date),
  title text not null check (char_length(title) between 1 and 100),
  effort text not null default '난이도 미기록' check (char_length(effort) <= 40),
  note text not null default '' check (char_length(note) <= 1000),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30),
  created_at timestamptz not null default now(),
  foreign key (trainer_id, member_id) references public.trainer_member_links(trainer_id, member_id)
);

create table if not exists public.record_comments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  log_key text not null check (char_length(log_key) between 1 and 120),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists trainer_links_member_idx on public.trainer_member_links (member_id, status);
create index if not exists trainer_entries_member_idx on public.trainer_log_entries (member_id, entry_date desc);
create index if not exists record_comments_thread_idx on public.record_comments (member_id, log_key, created_at);

alter table public.trainer_profiles enable row level security;
alter table public.trainer_member_links enable row level security;
alter table public.trainer_log_entries enable row level security;
alter table public.record_comments enable row level security;

revoke all on public.trainer_profiles, public.trainer_member_links, public.trainer_log_entries, public.record_comments from anon, authenticated, public;
grant select on public.trainer_profiles, public.trainer_member_links to authenticated;
grant select, insert on public.trainer_log_entries, public.record_comments to authenticated;

create or replace function public.member_sharing_allowed(target_member uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select basic_data_accepted and exercise_data_accepted
    from public.consent_events where user_id = target_member
    order by accepted_at desc, id desc limit 1
  ), false);
$$;
revoke all on function public.member_sharing_allowed(uuid) from public, anon;
grant execute on function public.member_sharing_allowed(uuid) to authenticated;

drop policy if exists "linked trainers read member data" on public.user_app_data;
create policy "linked trainers read member data" on public.user_app_data
  for select to authenticated using (
    public.member_sharing_allowed(user_id) and exists (
      select 1 from public.trainer_member_links l
      where l.member_id = user_id and l.trainer_id = (select auth.uid()) and l.status = 'active'
    )
  );

drop policy if exists "trainers read own profile" on public.trainer_profiles;
create policy "trainers read own profile" on public.trainer_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "members read linked trainer profile" on public.trainer_profiles;
create policy "members read linked trainer profile" on public.trainer_profiles
  for select to authenticated using (exists (
    select 1 from public.trainer_member_links l
    where l.trainer_id = user_id and l.member_id = (select auth.uid())
  ));
drop policy if exists "admins read trainer profiles" on public.trainer_profiles;
create policy "admins read trainer profiles" on public.trainer_profiles
  for select to authenticated using (exists (
    select 1 from public.admin_memberships a where a.user_id = (select auth.uid())
  ));
drop policy if exists "parties read own link" on public.trainer_member_links;
create policy "parties read own link" on public.trainer_member_links
  for select to authenticated using (trainer_id = (select auth.uid()) or member_id = (select auth.uid()));
drop policy if exists "admins read trainer links" on public.trainer_member_links;
create policy "admins read trainer links" on public.trainer_member_links
  for select to authenticated using (exists (
    select 1 from public.admin_memberships a where a.user_id = (select auth.uid())
  ));

drop policy if exists "members read trainer entries" on public.trainer_log_entries;
create policy "members read trainer entries" on public.trainer_log_entries
  for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "linked trainers read entries" on public.trainer_log_entries;
create policy "linked trainers read entries" on public.trainer_log_entries
  for select to authenticated using (trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l where l.trainer_id = trainer_log_entries.trainer_id
      and l.member_id = trainer_log_entries.member_id and l.status = 'active'));
drop policy if exists "linked trainers create entries with permission" on public.trainer_log_entries;
create policy "linked trainers create entries with permission" on public.trainer_log_entries
  for insert to authenticated with check (trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l where l.trainer_id = trainer_log_entries.trainer_id
      and l.member_id = trainer_log_entries.member_id and l.status = 'active' and l.can_write));
drop policy if exists "admins read trainer entries" on public.trainer_log_entries;
create policy "admins read trainer entries" on public.trainer_log_entries
  for select to authenticated using (exists (
    select 1 from public.admin_memberships a where a.user_id = (select auth.uid())
  ));

drop policy if exists "members read comments" on public.record_comments;
create policy "members read comments" on public.record_comments
  for select to authenticated using (member_id = (select auth.uid()));
drop policy if exists "linked trainers read comments" on public.record_comments;
create policy "linked trainers read comments" on public.record_comments
  for select to authenticated using (public.member_sharing_allowed(member_id) and exists (
    select 1 from public.trainer_member_links l where l.member_id = record_comments.member_id
      and l.trainer_id = (select auth.uid()) and l.status = 'active'
  ));
drop policy if exists "members and linked trainers create comments" on public.record_comments;
create policy "members and linked trainers create comments" on public.record_comments
  for insert to authenticated with check (author_id = (select auth.uid()) and (
    member_id = (select auth.uid()) or
    (public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l where l.member_id = record_comments.member_id
        and l.trainer_id = (select auth.uid()) and l.status = 'active'
    ))
  ));
drop policy if exists "admins read comments" on public.record_comments;
create policy "admins read comments" on public.record_comments
  for select to authenticated using (exists (
    select 1 from public.admin_memberships a where a.user_id = (select auth.uid())
  ));

create or replace function public.create_trainer_profile(trainer_name text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare code text;
begin
  if (select auth.uid()) is null then raise exception 'Login required'; end if;
  if char_length(btrim(coalesce(trainer_name, ''))) not between 1 and 60 then raise exception 'Invalid trainer name'; end if;
  insert into public.trainer_profiles (user_id, display_name)
  values ((select auth.uid()), btrim(trainer_name))
  on conflict (user_id) do update set display_name = excluded.display_name;
  select invite_code into code from public.trainer_profiles where user_id = (select auth.uid());
  return code;
end;
$$;

create or replace function public.join_trainer(code text, allow_trainer_write boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare trainer uuid;
begin
  if (select auth.uid()) is null then raise exception 'Login required'; end if;
  if not public.member_sharing_allowed((select auth.uid())) then raise exception 'Exercise data consent required'; end if;
  select user_id into trainer from public.trainer_profiles
  where invite_code = upper(regexp_replace(coalesce(code,''), '[^A-Za-z0-9]', '', 'g'));
  if trainer is null or trainer = (select auth.uid()) then raise exception 'Invalid trainer code'; end if;
  insert into public.trainer_member_links (trainer_id, member_id, status, can_write)
  values (trainer, (select auth.uid()), 'active', coalesce(allow_trainer_write,false))
  on conflict (trainer_id, member_id) do update
  set status = 'active', can_write = excluded.can_write, updated_at = now();
end;
$$;

create or replace function public.set_trainer_access(target_trainer uuid, allow_trainer_write boolean, revoke_link boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (select auth.uid()) is null then raise exception 'Login required'; end if;
  update public.trainer_member_links
  set status = case when revoke_link then 'revoked' else 'active' end,
      can_write = case when revoke_link then false else coalesce(allow_trainer_write,false) end,
      updated_at = now()
  where trainer_id = target_trainer and member_id = (select auth.uid());
  if not found then raise exception 'Trainer link not found'; end if;
end;
$$;

revoke all on function public.create_trainer_profile(text), public.join_trainer(text, boolean), public.set_trainer_access(uuid, boolean, boolean) from public, anon;
grant execute on function public.create_trainer_profile(text), public.join_trainer(text, boolean), public.set_trainer_access(uuid, boolean, boolean) to authenticated;
