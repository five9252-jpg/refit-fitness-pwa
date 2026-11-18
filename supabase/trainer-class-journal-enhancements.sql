-- Additive changes for trainer class types, fixed weekly sessions, and set-based lesson journals.
-- Existing sessions and journal text remain intact.

alter table public.trainer_class_sessions
  add column if not exists session_type text not null default 'PT',
  add column if not exists is_fixed boolean not null default false;

alter table public.trainer_class_sessions
  drop constraint if exists trainer_class_sessions_session_type_check;
alter table public.trainer_class_sessions
  add constraint trainer_class_sessions_session_type_check
  check (session_type in ('PT', 'OT'));

alter table public.trainer_lesson_journals
  add column if not exists workout_items jsonb not null default '[]'::jsonb,
  add column if not exists lesson_completed boolean not null default false;

alter table public.trainer_lesson_journals
  drop constraint if exists trainer_lesson_journals_workout_items_check;
alter table public.trainer_lesson_journals
  add constraint trainer_lesson_journals_workout_items_check
  check (
    jsonb_typeof(workout_items) = 'array'
    and jsonb_array_length(workout_items) <= 30
  );

comment on column public.trainer_class_sessions.session_type is 'PT or OT session label chosen by the trainer';
comment on column public.trainer_class_sessions.is_fixed is 'True when created as one occurrence in a fixed weekly series';
comment on column public.trainer_lesson_journals.workout_items is 'Trainer private set-by-set lesson workout notes';
comment on column public.trainer_lesson_journals.lesson_completed is 'Whether the trainer saved the lesson log before entering next-class planning';

