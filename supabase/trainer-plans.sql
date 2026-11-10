-- Trainer-authored next workout plans. Run after schema.sql and trainer.sql.
-- A member-approved active link permits a trainer to send a plan. The member
-- chooses whether to apply it; this table never edits the member's journal.

create table if not exists public.trainer_workout_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(user_id),
  member_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  body_part text not null check (body_part in ('가슴','등','어깨','팔','하체')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  note text not null default '' check (char_length(note) <= 1000),
  exercises jsonb not null check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) between 1 and 8),
  created_at timestamptz not null default now(),
  foreign key (trainer_id, member_id) references public.trainer_member_links(trainer_id, member_id)
);

create index if not exists trainer_plans_member_date_idx
  on public.trainer_workout_plans (member_id, target_date desc, created_at desc);
create index if not exists trainer_plans_trainer_member_idx
  on public.trainer_workout_plans (trainer_id, member_id, created_at desc);

alter table public.trainer_workout_plans enable row level security;
revoke all on public.trainer_workout_plans from public, anon, authenticated;
grant select, insert on public.trainer_workout_plans to authenticated;

drop policy if exists "members read received workout plans" on public.trainer_workout_plans;
create policy "members read received workout plans" on public.trainer_workout_plans
  for select to authenticated using (member_id = (select auth.uid()));

drop policy if exists "linked trainers read sent workout plans" on public.trainer_workout_plans;
create policy "linked trainers read sent workout plans" on public.trainer_workout_plans
  for select to authenticated using (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_workout_plans.trainer_id
        and l.member_id = trainer_workout_plans.member_id and l.status = 'active')
  );

drop policy if exists "linked trainers send workout plans" on public.trainer_workout_plans;
create policy "linked trainers send workout plans" on public.trainer_workout_plans
  for insert to authenticated with check (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_workout_plans.trainer_id
        and l.member_id = trainer_workout_plans.member_id and l.status = 'active')
  );

drop policy if exists "admins read workout plans" on public.trainer_workout_plans;
create policy "admins read workout plans" on public.trainer_workout_plans
  for select to authenticated using (exists (
    select 1 from public.admin_memberships a where a.user_id = (select auth.uid())
  ));
