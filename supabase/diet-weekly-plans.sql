-- Weekly meal ideas, separate from actual diet entries.
-- Run after diet.sql and trainer-sharing-and-pose.sql.
create table if not exists public.diet_weekly_plans (
  member_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  days jsonb not null check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) = 7 and length(days::text) <= 12000),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (member_id, week_start)
);

alter table public.diet_weekly_plans enable row level security;
revoke all on public.diet_weekly_plans from anon, public;
grant select, insert, update on public.diet_weekly_plans to authenticated;

create or replace function public.member_diet_share_allowed(target_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.server_storage and c.share_with_trainer
    from public.diet_consents c where c.user_id = target_member), false);
$$;
revoke all on function public.member_diet_share_allowed(uuid) from public, anon;
grant execute on function public.member_diet_share_allowed(uuid) to authenticated;

create policy "members read own weekly diet plans" on public.diet_weekly_plans
  for select to authenticated using (member_id = (select auth.uid()));
create policy "members write consented weekly diet plans" on public.diet_weekly_plans
  for insert to authenticated with check (
    member_id = (select auth.uid()) and updated_by = (select auth.uid())
    and exists (select 1 from public.diet_consents c where c.user_id = member_id and c.server_storage)
  );
create policy "members update consented weekly diet plans" on public.diet_weekly_plans
  for update to authenticated using (member_id = (select auth.uid()))
  with check (
    member_id = (select auth.uid()) and updated_by = (select auth.uid())
    and exists (select 1 from public.diet_consents c where c.user_id = member_id and c.server_storage)
  );
create policy "linked trainers read shared weekly diet plans" on public.diet_weekly_plans
  for select to authenticated using (
    public.member_sharing_allowed(member_id)
    and public.member_diet_share_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l where l.member_id = diet_weekly_plans.member_id and l.trainer_id = (select auth.uid()) and l.status = 'active')
  );
create policy "linked trainers insert shared weekly diet plans" on public.diet_weekly_plans
  for insert to authenticated with check (
    updated_by = (select auth.uid()) and public.member_sharing_allowed(member_id)
    and public.member_diet_share_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l where l.member_id = diet_weekly_plans.member_id and l.trainer_id = (select auth.uid()) and l.status = 'active' and l.can_write)
  );
create policy "linked trainers update shared weekly diet plans" on public.diet_weekly_plans
  for update to authenticated using (
    public.member_sharing_allowed(member_id)
    and public.member_diet_share_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l where l.member_id = diet_weekly_plans.member_id and l.trainer_id = (select auth.uid()) and l.status = 'active' and l.can_write)
  ) with check (
    updated_by = (select auth.uid()) and public.member_sharing_allowed(member_id)
    and public.member_diet_share_allowed(member_id)
    and exists (select 1 from public.trainer_member_links l where l.member_id = diet_weekly_plans.member_id and l.trainer_id = (select auth.uid()) and l.status = 'active' and l.can_write)
  );

