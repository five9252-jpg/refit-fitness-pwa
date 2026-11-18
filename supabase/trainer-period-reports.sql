begin;
create table if not exists public.trainer_period_reports (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  member_id uuid not null,
  period_type text not null check (period_type in ('week','month')),
  period_start date not null,
  period_end date not null,
  report_data jsonb not null default '{}'::jsonb check (jsonb_typeof(report_data)='object'),
  trainer_note text not null default '' check (char_length(trainer_note)<=2000),
  next_focus text not null default '' check (char_length(next_focus)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (trainer_id,member_id,period_type,period_start),
  foreign key (trainer_id,member_id)
    references public.trainer_member_links(trainer_id,member_id) on delete cascade
);
create index if not exists trainer_period_reports_member_idx
  on public.trainer_period_reports(trainer_id,member_id,period_start desc);
alter table public.trainer_period_reports enable row level security;
revoke all on public.trainer_period_reports from public,anon,authenticated;
grant select,insert,update,delete on public.trainer_period_reports to authenticated;
drop policy if exists "linked trainers manage member period reports" on public.trainer_period_reports;
create policy "linked trainers manage member period reports" on public.trainer_period_reports
  for all to authenticated using (
    trainer_id=(select auth.uid())
    and public.member_sharing_allowed(member_id)
    and exists(select 1 from public.trainer_member_links l
      where l.trainer_id=trainer_period_reports.trainer_id
        and l.member_id=trainer_period_reports.member_id
        and l.status='active')
  ) with check (
    trainer_id=(select auth.uid())
    and public.member_sharing_allowed(member_id)
    and exists(select 1 from public.trainer_member_links l
      where l.trainer_id=trainer_period_reports.trainer_id
        and l.member_id=trainer_period_reports.member_id
        and l.status='active')
  );
comment on table public.trainer_period_reports is 'Private trainer-created weekly and monthly workout reports for actively linked members';
commit;

