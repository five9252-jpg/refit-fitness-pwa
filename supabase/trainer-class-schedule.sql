-- Trainer class calendar and private lesson journals.
-- Apply after schema.sql and trainer.sql.

create table if not exists public.trainer_class_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  session_at timestamptz not null,
  duration_minutes integer not null default 50 check (duration_minutes in (30, 50, 60, 90)),
  title text not null default 'PT 수업' check (char_length(btrim(title)) between 1 and 80),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trainer_id, member_id),
  foreign key (trainer_id, member_id) references public.trainer_member_links(trainer_id, member_id)
);

create table if not exists public.trainer_lesson_journals (
  session_id uuid primary key,
  trainer_id uuid not null,
  member_id uuid not null,
  lesson_summary text not null default '' check (char_length(lesson_summary) <= 2000),
  private_notes text not null default '' check (char_length(private_notes) <= 2000),
  next_steps text not null default '' check (char_length(next_steps) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, trainer_id, member_id)
    references public.trainer_class_sessions(id, trainer_id, member_id) on delete cascade
);

create index if not exists trainer_class_sessions_trainer_time_idx
  on public.trainer_class_sessions(trainer_id, session_at);
create index if not exists trainer_class_sessions_member_time_idx
  on public.trainer_class_sessions(member_id, session_at);
create index if not exists trainer_lesson_journals_trainer_member_idx
  on public.trainer_lesson_journals(trainer_id, member_id, updated_at desc);

alter table public.trainer_class_sessions enable row level security;
alter table public.trainer_lesson_journals enable row level security;
revoke all on public.trainer_class_sessions, public.trainer_lesson_journals from public, anon, authenticated;
grant select, insert, update on public.trainer_class_sessions to authenticated;
grant select, insert, update on public.trainer_lesson_journals to authenticated;

drop policy if exists "linked parties read class sessions" on public.trainer_class_sessions;
create policy "linked parties read class sessions" on public.trainer_class_sessions
  for select to authenticated using (
    public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_class_sessions.trainer_id
        and l.member_id = trainer_class_sessions.member_id and l.status = 'active'
        and ((select auth.uid()) = l.trainer_id or (select auth.uid()) = l.member_id)
    )
  );

drop policy if exists "linked trainers create class sessions" on public.trainer_class_sessions;
create policy "linked trainers create class sessions" on public.trainer_class_sessions
  for insert to authenticated with check (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_class_sessions.trainer_id
        and l.member_id = trainer_class_sessions.member_id and l.status = 'active'
    )
  );

drop policy if exists "linked trainers update class sessions" on public.trainer_class_sessions;
create policy "linked trainers update class sessions" on public.trainer_class_sessions
  for update to authenticated using (
    trainer_id = (select auth.uid()) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_class_sessions.trainer_id
        and l.member_id = trainer_class_sessions.member_id and l.status = 'active'
    )
  ) with check (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_class_sessions.trainer_id
        and l.member_id = trainer_class_sessions.member_id and l.status = 'active'
    )
  );

drop policy if exists "linked trainers manage lesson journals" on public.trainer_lesson_journals;
create policy "linked trainers manage lesson journals" on public.trainer_lesson_journals
  for all to authenticated using (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_lesson_journals.trainer_id
        and l.member_id = trainer_lesson_journals.member_id and l.status = 'active'
    )
  ) with check (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_lesson_journals.trainer_id
        and l.member_id = trainer_lesson_journals.member_id and l.status = 'active'
    ) and exists (
      select 1 from public.trainer_class_sessions cs
      where cs.id = trainer_lesson_journals.session_id
        and cs.trainer_id = trainer_lesson_journals.trainer_id
        and cs.member_id = trainer_lesson_journals.member_id
    )
  );

