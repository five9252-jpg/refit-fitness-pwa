begin;
create table if not exists public.trainer_lesson_media (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  trainer_id uuid not null,
  member_id uuid not null,
  kind text not null check (kind in ('photo','handwriting')),
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_name text not null default '' check (char_length(file_name) <= 255),
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now(),
  foreign key (session_id,trainer_id,member_id)
    references public.trainer_class_sessions(id,trainer_id,member_id) on delete cascade,
  check (
    object_path = trainer_id::text || '/' || session_id::text || '/' || id::text ||
    case mime_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' when 'image/webp' then '.webp' end
  )
);
create index if not exists trainer_lesson_media_session_idx
  on public.trainer_lesson_media(trainer_id,session_id,created_at);
alter table public.trainer_lesson_media enable row level security;
revoke all on public.trainer_lesson_media from public,anon,authenticated;
grant select,insert,delete on public.trainer_lesson_media to authenticated;
grant update(status) on public.trainer_lesson_media to authenticated;
drop policy if exists "linked trainer manages class lesson media" on public.trainer_lesson_media;
create policy "linked trainer manages class lesson media" on public.trainer_lesson_media
  for all to authenticated using (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_lesson_media.trainer_id
        and l.member_id = trainer_lesson_media.member_id and l.status = 'active'
    )
  ) with check (
    trainer_id = (select auth.uid()) and public.member_sharing_allowed(member_id) and exists (
      select 1 from public.trainer_member_links l
      where l.trainer_id = trainer_lesson_media.trainer_id
        and l.member_id = trainer_lesson_media.member_id and l.status = 'active'
    ) and exists (
      select 1 from public.trainer_class_sessions cs
      where cs.id = trainer_lesson_media.session_id
        and cs.trainer_id = trainer_lesson_media.trainer_id
        and cs.member_id = trainer_lesson_media.member_id
    )
  );
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trainer-class-media','trainer-class-media',false,12582912,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "linked trainer uploads class lesson media" on storage.objects;
create policy "linked trainer uploads class lesson media" on storage.objects
  for insert to authenticated with check (
    bucket_id='trainer-class-media' and (storage.foldername(name))[1]=(select auth.uid())::text
    and exists(select 1 from public.trainer_lesson_media m where m.object_path=name and m.trainer_id=(select auth.uid()) and m.status='pending')
  );
drop policy if exists "linked trainer reads class lesson media" on storage.objects;
create policy "linked trainer reads class lesson media" on storage.objects
  for select to authenticated using (
    bucket_id='trainer-class-media' and exists(select 1 from public.trainer_lesson_media m where m.object_path=name and m.trainer_id=(select auth.uid()) and m.status='ready')
  );
drop policy if exists "linked trainer deletes class lesson media" on storage.objects;
create policy "linked trainer deletes class lesson media" on storage.objects
  for delete to authenticated using (
    bucket_id='trainer-class-media' and (storage.foldername(name))[1]=(select auth.uid())::text
    and exists(select 1 from public.trainer_lesson_media m where m.object_path=name and m.trainer_id=(select auth.uid()))
  );
comment on table public.trainer_lesson_media is 'Private image and handwriting attachments for linked trainer class journals';
commit;

