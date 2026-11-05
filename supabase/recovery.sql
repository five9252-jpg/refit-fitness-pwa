-- Run after schema.sql and trainer.sql. Account withdrawal and optional one-year recovery.
-- Only a verified owner of the same email can restore an archive. Never expose archives through the Data API.

alter table public.trainer_log_entries alter column trainer_id drop not null;
-- Historical entries must survive when a trainer closes an account. Inserts are
-- still restricted to active links by the trainer_log_entries RLS policy.
alter table public.trainer_log_entries drop constraint if exists trainer_log_entries_trainer_id_member_id_fkey;
alter table public.trainer_log_entries drop constraint if exists trainer_log_entries_trainer_id_fkey;
alter table public.trainer_log_entries add constraint trainer_log_entries_trainer_id_fkey
  foreign key (trainer_id) references public.trainer_profiles(user_id) on delete set null;

alter table public.record_comments alter column author_id drop not null;
alter table public.record_comments drop constraint if exists record_comments_author_id_fkey;
alter table public.record_comments add constraint record_comments_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

create table if not exists public.account_recovery_archives (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  original_user_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  trainer_entries jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  archived_at timestamptz not null default now(),
  purge_at timestamptz not null default (now() + interval '1 year')
);
create index if not exists account_recovery_purge_idx on public.account_recovery_archives (purge_at);
alter table public.account_recovery_archives enable row level security;
revoke all on public.account_recovery_archives from public, anon, authenticated;

create or replace function public.withdraw_account(keep_recovery boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := (select auth.uid());
  account_email text;
  verified_at timestamptz;
  saved_payload jsonb;
  saved_entries jsonb;
  saved_comments jsonb;
begin
  if account_id is null then raise exception 'Login required'; end if;
  -- Archive retention stays off until a verified automatic purge job is approved.
  if coalesce(keep_recovery, false) then raise exception 'Recovery archive is not enabled'; end if;
  select lower(email), email_confirmed_at into account_email, verified_at
    from auth.users where id = account_id for update;
  if account_email is null then raise exception 'Account not found'; end if;

  if coalesce(keep_recovery, false) then
    if verified_at is null then raise exception 'Verified email required for recovery'; end if;
    select payload into saved_payload from public.user_app_data where user_id = account_id;
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', 'trainer-' || id::text, 'loggedAt', created_at,
      'date', entry_date, 'title', title, 'effort', effort,
      'note', note, 'items', items, 'photoIds', '[]'::jsonb,
      'source', 'trainer', 'trainerId', trainer_id
    ) order by created_at), '[]'::jsonb) into saved_entries
      from public.trainer_log_entries where member_id = account_id;
    select coalesce(jsonb_agg(jsonb_build_object(
      'log_key', log_key, 'author_id', author_id,
      'body', body, 'created_at', created_at
    ) order by created_at), '[]'::jsonb) into saved_comments
      from public.record_comments where member_id = account_id;
    insert into public.account_recovery_archives
      (email, original_user_id, payload, trainer_entries, comments, archived_at, purge_at)
      values (account_email, account_id, coalesce(saved_payload, '{}'::jsonb), saved_entries, saved_comments,
              now(), now() + interval '1 year')
    on conflict (email) do update set original_user_id = excluded.original_user_id,
      payload = excluded.payload, trainer_entries = excluded.trainer_entries,
      comments = excluded.comments, archived_at = excluded.archived_at, purge_at = excluded.purge_at;
  else
    delete from public.account_recovery_archives where email = account_email;
  end if;

  -- Meal photos live in private object storage and do not cascade with auth.users.
  delete from storage.objects where bucket_id = 'diet-photos' and name like account_id::text || '/%';
  delete from auth.users where id = account_id;
  if not found then raise exception 'Account deletion failed'; end if;
end;
$$;

create or replace function public.restore_withdrawn_records()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := (select auth.uid());
  account_email text;
  verified_at timestamptz;
  saved public.account_recovery_archives%rowtype;
  restored_payload jsonb;
begin
  if account_id is null then raise exception 'Login required'; end if;
  select lower(email), email_confirmed_at into account_email, verified_at
    from auth.users where id = account_id;
  if account_email is null or verified_at is null then raise exception 'Verified email required'; end if;
  select * into saved from public.account_recovery_archives
    where email = account_email and purge_at > now() for update;
  if not found then return false; end if;

  restored_payload := jsonb_set(
    coalesce(saved.payload, '{}'::jsonb), '{logs}',
    coalesce(saved.payload->'logs', '[]'::jsonb) || saved.trainer_entries, true
  );
  insert into public.user_app_data (user_id, payload, updated_at)
    values (account_id, restored_payload, now())
    on conflict (user_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;

  insert into public.record_comments (member_id, log_key, author_id, body, created_at)
    select account_id, c->>'log_key',
      case
        when c->>'author_id' = saved.original_user_id::text then account_id
        when exists (select 1 from auth.users u where u.id = (c->>'author_id')::uuid)
          then (c->>'author_id')::uuid
        else null
      end,
      c->>'body', (c->>'created_at')::timestamptz
    from jsonb_array_elements(saved.comments) as c;

  delete from public.account_recovery_archives where id = saved.id;
  return true;
end;
$$;

revoke all on function public.withdraw_account(boolean), public.restore_withdrawn_records() from public, anon;
grant execute on function public.withdraw_account(boolean), public.restore_withdrawn_records() to authenticated;

-- In Supabase SQL Editor, enable pg_cron and run the purge job once after this file:
-- create extension if not exists pg_cron;
-- select cron.schedule('pacefit-purge-recovery-archives', '0 3 * * *',
--   $$delete from public.account_recovery_archives where purge_at <= now()$$);
