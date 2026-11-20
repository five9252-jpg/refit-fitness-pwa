-- Notice recipients are fixed when a trainer publishes. Only active links can be selected.
alter table public.trainer_announcements
  add column if not exists audience_type text not null default 'legacy_all'
    check (audience_type in ('legacy_all','all','member','pt','ot','management')),
  add column if not exists recipient_ids uuid[] not null default '{}',
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

create index if not exists trainer_announcements_recipients_idx
  on public.trainer_announcements using gin (recipient_ids);

alter table public.trainer_announcements
  add constraint trainer_notice_recipients_valid check (
    (audience_type = 'legacy_all' and cardinality(recipient_ids) = 0)
    or (audience_type <> 'legacy_all' and cardinality(recipient_ids) between 1 and 200)
  );

drop policy if exists "trainer or linked member reads announcements" on public.trainer_announcements;
create policy "trainer or selected linked member reads announcements"
  on public.trainer_announcements for select to authenticated
  using (
    trainer_id = (select auth.uid())
    or (
      (audience_type = 'legacy_all' or (select auth.uid()) = any(recipient_ids))
      and exists (
        select 1 from public.trainer_member_links link
        where link.trainer_id = trainer_announcements.trainer_id
          and link.member_id = (select auth.uid()) and link.status = 'active'
      )
    )
  );

drop policy if exists "trainer creates own announcements" on public.trainer_announcements;
create policy "trainer creates targeted announcements"
  on public.trainer_announcements for insert to authenticated
  with check (
    trainer_id = (select auth.uid()) and audience_type <> 'legacy_all'
    and attachment_path is null
    and exists (select 1 from public.trainer_profiles p where p.user_id = (select auth.uid()))
    and not exists (
      select 1 from unnest(recipient_ids) recipient
      where not exists (
        select 1 from public.trainer_member_links link
        where link.trainer_id = (select auth.uid()) and link.member_id = recipient
          and link.status = 'active'
      )
    )
  );

drop policy if exists "trainer updates own announcements" on public.trainer_announcements;
create policy "trainer updates own announcement attachments"
  on public.trainer_announcements for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid())
    and audience_type <> 'legacy_all'
    and (attachment_path is null or attachment_path like trainer_id::text || '/' || id::text || '/%')
    and not exists (
      select 1 from unnest(recipient_ids) recipient
      where not exists (
        select 1 from public.trainer_member_links link
        where link.trainer_id = (select auth.uid()) and link.member_id = recipient
          and link.status = 'active'
      )
    )
  );

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('trainer-notice-files','trainer-notice-files',false,10485760,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy "trainer uploads own notice files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'trainer-notice-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.trainer_announcements n
      where n.id::text = (storage.foldername(name))[2] and n.trainer_id = (select auth.uid())
    )
  );

create policy "notice recipients read private files" on storage.objects
  for select to authenticated using (
    bucket_id = 'trainer-notice-files'
    and exists (
      select 1 from public.trainer_announcements n
      where n.attachment_path = name
        and (n.trainer_id = (select auth.uid()) or
          ((n.audience_type = 'legacy_all' or (select auth.uid()) = any(n.recipient_ids))
           and exists (select 1 from public.trainer_member_links link
             where link.trainer_id = n.trainer_id and link.member_id = (select auth.uid())
               and link.status = 'active')))
    )
  );

create policy "trainer deletes own notice files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'trainer-notice-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
