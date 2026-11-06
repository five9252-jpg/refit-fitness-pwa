-- Optional diet data and private meal-photo storage. Run after schema.sql.
-- Diet records/photos are never exposed to trainers by these policies.
create table if not exists public.diet_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  server_storage boolean not null default false,
  ai_photo_analysis boolean not null default false,
  notice_version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists public.food_nutrients (
  food_code text primary key,
  food_name text not null,
  food_group text,
  serving_g numeric,
  kcal numeric,
  carbs numeric,
  protein numeric,
  fat numeric,
  source_name text not null default 'K-FIND',
  source_updated_at date,
  updated_at timestamptz not null default now()
);
create table if not exists public.diet_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  server_storage boolean not null,
  ai_photo_analysis boolean not null,
  notice_version text not null,
  accepted_at timestamptz not null default now()
);
create index if not exists food_nutrients_name_search_idx on public.food_nutrients using gin (to_tsvector('simple', food_name));
-- The live lookup uses ILIKE '%query%'; a trigram index avoids scanning the
-- full K-FIND catalogue for every search once the database is populated.
create extension if not exists pg_trgm with schema extensions;
create index if not exists food_nutrients_name_trgm_idx on public.food_nutrients using gin (food_name extensions.gin_trgm_ops);

create table if not exists public.diet_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('아침','점심','저녁','간식')),
  food_name text not null default '',
  amount_g numeric check (amount_g is null or amount_g between 0 and 10000),
  note text,
  food_code text references public.food_nutrients(food_code) on delete set null,
  source_name text,
  nutrients jsonb not null default '{}'::jsonb,
  photo_path text,
  created_at timestamptz not null default now(),
  constraint diet_photo_owner_path check (photo_path is null or photo_path like user_id::text || '/%')
);
create index if not exists diet_entries_user_date_idx on public.diet_entries(user_id, entry_date desc, created_at);

alter table public.diet_consents enable row level security;
alter table public.diet_consent_events enable row level security;
alter table public.food_nutrients enable row level security;
alter table public.diet_entries enable row level security;
revoke all on public.diet_consents, public.diet_consent_events, public.food_nutrients, public.diet_entries from anon, public;
grant select, insert, update on public.diet_consents to authenticated;
grant select, insert on public.diet_consent_events to authenticated;
grant select on public.food_nutrients to authenticated;
grant select, insert, delete on public.diet_entries to authenticated;

drop policy if exists "users own diet consent" on public.diet_consents;
create policy "users own diet consent" on public.diet_consents for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users read own diet consent events" on public.diet_consent_events;
create policy "users read own diet consent events" on public.diet_consent_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users add own diet consent events" on public.diet_consent_events;
create policy "users add own diet consent events" on public.diet_consent_events for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "admins read diet consent events" on public.diet_consent_events;
create policy "admins read diet consent events" on public.diet_consent_events for select to authenticated
  using (exists(select 1 from public.admin_memberships m where m.user_id=(select auth.uid())));
drop policy if exists "authenticated food lookup" on public.food_nutrients;
create policy "authenticated food lookup" on public.food_nutrients for select to authenticated using (true);
drop policy if exists "users manage own diet entries" on public.diet_entries;
drop policy if exists "users read own diet entries" on public.diet_entries;
create policy "users read own diet entries" on public.diet_entries for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "users insert own diet entries with consent" on public.diet_entries;
create policy "users insert own diet entries with consent" on public.diet_entries for insert to authenticated
  with check ((select auth.uid()) = user_id and exists(select 1 from public.diet_consents c where c.user_id=(select auth.uid()) and c.server_storage));
drop policy if exists "users delete own diet entries" on public.diet_entries;
create policy "users delete own diet entries" on public.diet_entries for delete to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "admins read diet entries" on public.diet_entries;
create policy "admins read diet entries" on public.diet_entries for select to authenticated
  using (exists(select 1 from public.admin_memberships m where m.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('diet-photos','diet-photos',false,8388608,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "users upload own diet photos" on storage.objects;
create policy "users upload own diet photos" on storage.objects for insert to authenticated
  with check (bucket_id='diet-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.diet_consents c where c.user_id=(select auth.uid()) and c.server_storage));
drop policy if exists "users read own diet photos" on storage.objects;
create policy "users read own diet photos" on storage.objects for select to authenticated
  using (bucket_id='diet-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.admin_memberships m where m.user_id=(select auth.uid()))));
drop policy if exists "users delete own diet photos" on storage.objects;
create policy "users delete own diet photos" on storage.objects for delete to authenticated
  using (bucket_id='diet-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Admin-only DB import is intentionally done from a trusted Edge Function using
-- K-FIND_API_KEY and SUPABASE_SERVICE_ROLE_KEY secrets, never from browser code.

