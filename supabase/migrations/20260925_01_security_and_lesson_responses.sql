-- ============================================================
-- SYLA migration 2026-09-25
-- Run once in Supabase → SQL Editor, AFTER supabase/schema.sql.
-- Safe to re-run (every statement is idempotent).
--
--  1. Security: students can no longer promote themselves to admin
--     or move themselves between small groups.
--  2. Attendance: students can self check-in only from 1 hour before
--     a meeting until 3 hours after it starts (admins: any time).
--  3. Daily check-in dates default to US Eastern time, not UTC.
--  4. New: lesson_responses (reflection journal + Action Step proof).
--  5. New: private "action-photos" storage bucket for Action Step photos.
-- ============================================================

-- ---------- 1. Lock privileged profile columns ----------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No end-user JWT (SQL editor, service role): allow everything.
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.group_id is distinct from old.group_id then
    raise exception 'Only an admin can change role or group'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- A self-created profile must start as an unassigned student.
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id and role = 'student' and group_id is null);

-- ---------- 2. Attendance time window ----------
drop policy if exists "attendance_insert_own_or_admin" on public.attendance;
create policy "attendance_insert_own_or_admin" on public.attendance
  for insert with check (
    public.is_admin()
    or (
      auth.uid() = user_id
      and exists (
        select 1 from public.events e
        where e.id = event_id
          and now() between e.starts_at - interval '60 minutes'
                        and e.starts_at + interval '180 minutes'
      )
    )
  );

-- ---------- 3. Eastern-time default for daily check-ins ----------
alter table public.daily_checkins
  alter column checkin_date set default ((now() at time zone 'America/New_York')::date);

-- ---------- helper: is the current user the leader of target's small group? ----------
create or replace function public.is_leader_of(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.groups g on g.id = p.group_id
    where p.id::text = target
      and g.leader_id = auth.uid()
  );
$$;

-- ---------- 4. lesson_responses ----------
create table if not exists public.lesson_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  reflection text,
  action_note text,
  action_done boolean not null default false,
  action_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists lesson_responses_lesson_idx on public.lesson_responses (lesson_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lesson_responses_touch on public.lesson_responses;
create trigger lesson_responses_touch
  before update on public.lesson_responses
  for each row execute function public.touch_updated_at();

alter table public.lesson_responses enable row level security;

drop policy if exists "responses_select_own_leader_admin" on public.lesson_responses;
create policy "responses_select_own_leader_admin" on public.lesson_responses
  for select using (auth.uid() = user_id or public.is_admin() or public.is_leader_of(user_id::text));

drop policy if exists "responses_insert_own" on public.lesson_responses;
create policy "responses_insert_own" on public.lesson_responses
  for insert with check (auth.uid() = user_id);

drop policy if exists "responses_update_own" on public.lesson_responses;
create policy "responses_update_own" on public.lesson_responses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 5. Action Step photo storage ----------
-- Files live at action-photos/<user_id>/<lesson_id>/<file>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('action-photos', 'action-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "action_photos_insert_own" on storage.objects;
create policy "action_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'action-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "action_photos_select" on storage.objects;
create policy "action_photos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'action-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.is_leader_of((storage.foldername(name))[1])
    )
  );

drop policy if exists "action_photos_update_own" on storage.objects;
create policy "action_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'action-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "action_photos_delete_own" on storage.objects;
create policy "action_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'action-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Check: who currently has elevated roles? ----------
-- Review this list after running. Anyone here who shouldn't be can be reset with:
--   update public.profiles set role = 'student' where id = '<id>';
select id, full_name, role, created_at
from public.profiles
where role <> 'student'
order by created_at;
