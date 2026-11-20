create table if not exists public.trainer_lesson_settings (
  trainer_id uuid primary key references public.trainer_profiles(user_id) on delete cascade,
  show_workout boolean not null default true,
  show_summary boolean not null default true,
  show_media boolean not null default true,
  show_private_notes boolean not null default true,
  default_sets smallint not null default 1 check (default_sets between 1 and 5),
  updated_at timestamptz not null default now()
);

alter table public.trainer_lesson_settings enable row level security;
revoke all on public.trainer_lesson_settings from public, anon;
grant select, insert, update on public.trainer_lesson_settings to authenticated;

drop policy if exists trainer_lesson_settings_select_self on public.trainer_lesson_settings;
create policy trainer_lesson_settings_select_self on public.trainer_lesson_settings
  for select to authenticated using ((select auth.uid()) = trainer_id);

drop policy if exists trainer_lesson_settings_insert_self on public.trainer_lesson_settings;
create policy trainer_lesson_settings_insert_self on public.trainer_lesson_settings
  for insert to authenticated with check ((select auth.uid()) = trainer_id);

drop policy if exists trainer_lesson_settings_update_self on public.trainer_lesson_settings;
create policy trainer_lesson_settings_update_self on public.trainer_lesson_settings
  for update to authenticated
  using ((select auth.uid()) = trainer_id)
  with check ((select auth.uid()) = trainer_id);
