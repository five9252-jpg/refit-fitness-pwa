create table if not exists public.trainer_announcements (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trainer_announcements_trainer_recent
  on public.trainer_announcements (trainer_id, created_at desc);

alter table public.trainer_announcements enable row level security;

create policy "trainer or linked member reads announcements"
  on public.trainer_announcements for select to authenticated
  using (
    trainer_id = (select auth.uid())
    or exists (
      select 1 from public.trainer_member_links link
      where link.trainer_id = trainer_announcements.trainer_id
        and link.member_id = (select auth.uid())
        and link.status = 'active'
    )
  );

create policy "trainer creates own announcements"
  on public.trainer_announcements for insert to authenticated
  with check (
    trainer_id = (select auth.uid())
    and exists (select 1 from public.trainer_profiles profile where profile.user_id = (select auth.uid()))
  );

create policy "trainer updates own announcements"
  on public.trainer_announcements for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

create policy "trainer deletes own announcements"
  on public.trainer_announcements for delete to authenticated
  using (trainer_id = (select auth.uid()));

grant select, insert, update, delete on public.trainer_announcements to authenticated;
