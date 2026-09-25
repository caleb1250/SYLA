-- ============================================================
-- SYLA migration 2026-09-26 · Stage 2: automatic badges
-- Run once in Supabase → SQL Editor, AFTER 20260925_01.
-- Safe to re-run.
--
-- Badges are now awarded by the database itself whenever a student
-- checks in, attends, completes a session or writes a response —
-- students cannot award themselves (user_badges stays admin-write only),
-- and admins can still award/remove any badge by hand.
-- Automatic badges are only ever added, never taken away.
-- ============================================================

-- ---------- badge codes (stable ids the app & triggers use) ----------
alter table public.badges add column if not exists code text;
create unique index if not exists badges_code_key on public.badges (code);

update public.badges set code = 'first_attendance' where name = '첫 출석' and code is null;
update public.badges set code = 'qt_streak_7' where name = '7일 연속 QT' and code is null;
update public.badges set code = 'course_complete' where name = '과정 수료' and code is null;

insert into public.badges (code, name, description, icon) values
  ('first_attendance', '첫 출석', '첫 모임에 출석했어요', 'award'),
  ('attendance_10', '출석 10회', '모임에 10번 출석했어요', 'calendar-check'),
  ('qt_streak_7', '7일 연속 QT', '7일 연속 묵상을 완료했어요', 'flame'),
  ('streak_30', '30일 연속 체크', '30일 동안 하루도 빠짐없이 자가 체크를 했어요', 'flame'),
  ('reflection_5', '묵상 노트 5편', '세션 묵상 노트를 5편 작성했어요', 'pen-line'),
  ('action_5', 'Action Step 5회', 'Action Step을 5번 실천했어요', 'footprints'),
  ('module_complete', '모듈 완주', '한 모듈의 세션을 모두 마쳤어요', 'layers'),
  ('course_complete', '과정 수료', '커리큘럼 한 과정을 모두 마쳤어요', 'certificate')
on conflict (code) do nothing;

-- ---------- helpers ----------
create or replace function public.award_badge(p_user uuid, p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_badges (user_id, badge_id)
  select p_user, id from public.badges where code = p_code
  on conflict (user_id, badge_id) do nothing;
$$;

-- Longest run of consecutive check-in days.
-- p_kind = 'any' (at least one item checked) or 'meditation' (말씀묵상 checked).
create or replace function public.best_checkin_streak(p_user uuid, p_kind text default 'any')
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(len), 0)::int
  from (
    select count(*) as len
    from (
      select checkin_date - (row_number() over (order by checkin_date))::int as grp
      from public.daily_checkins
      where user_id = p_user
        and case when p_kind = 'meditation' then meditation
                 else (bible_reading or meditation or memorization or pray_note) end
    ) days
    group by grp
  ) runs;
$$;

create or replace function public.recompute_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n_attend int;
  n_reflect int;
  n_action int;
begin
  if p_user is null then
    return;
  end if;

  select count(*) into n_attend from public.attendance where user_id = p_user;
  if n_attend >= 1 then perform public.award_badge(p_user, 'first_attendance'); end if;
  if n_attend >= 10 then perform public.award_badge(p_user, 'attendance_10'); end if;

  if public.best_checkin_streak(p_user, 'meditation') >= 7 then
    perform public.award_badge(p_user, 'qt_streak_7');
  end if;
  if public.best_checkin_streak(p_user, 'any') >= 30 then
    perform public.award_badge(p_user, 'streak_30');
  end if;

  select count(*) filter (where nullif(btrim(reflection), '') is not null),
         count(*) filter (where action_done)
    into n_reflect, n_action
  from public.lesson_responses where user_id = p_user;
  if n_reflect >= 5 then perform public.award_badge(p_user, 'reflection_5'); end if;
  if n_action >= 5 then perform public.award_badge(p_user, 'action_5'); end if;

  -- a module with at least one session, every session completed
  if exists (
    select 1 from public.modules m
    where exists (select 1 from public.lessons l where l.module_id = m.id)
      and not exists (
        select 1 from public.lessons l
        where l.module_id = m.id
          and not exists (
            select 1 from public.lesson_progress p
            where p.user_id = p_user and p.lesson_id = l.id and p.completed
          )
      )
  ) then
    perform public.award_badge(p_user, 'module_complete');
  end if;

  -- a published course with at least one session, every session completed
  if exists (
    select 1 from public.courses c
    where c.published
      and exists (
        select 1 from public.lessons l join public.modules m on m.id = l.module_id
        where m.course_id = c.id
      )
      and not exists (
        select 1 from public.lessons l join public.modules m on m.id = l.module_id
        where m.course_id = c.id
          and not exists (
            select 1 from public.lesson_progress p
            where p.user_id = p_user and p.lesson_id = l.id and p.completed
          )
      )
  ) then
    perform public.award_badge(p_user, 'course_complete');
  end if;
end;
$$;

-- These run with elevated rights, so nobody may call them directly through the API.
revoke execute on function public.award_badge(uuid, text) from public, anon, authenticated;
revoke execute on function public.best_checkin_streak(uuid, text) from public, anon, authenticated;
revoke execute on function public.recompute_badges(uuid) from public, anon, authenticated;

-- ---------- triggers ----------
create or replace function public.badges_after_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_badges(new.user_id);
  return null;
end;
$$;

drop trigger if exists badges_on_attendance on public.attendance;
create trigger badges_on_attendance
  after insert on public.attendance
  for each row execute function public.badges_after_activity();

drop trigger if exists badges_on_checkin on public.daily_checkins;
create trigger badges_on_checkin
  after insert or update on public.daily_checkins
  for each row execute function public.badges_after_activity();

drop trigger if exists badges_on_progress on public.lesson_progress;
create trigger badges_on_progress
  after insert or update on public.lesson_progress
  for each row execute function public.badges_after_activity();

drop trigger if exists badges_on_response on public.lesson_responses;
create trigger badges_on_response
  after insert or update on public.lesson_responses
  for each row execute function public.badges_after_activity();

-- ---------- backfill: award what students have already earned ----------
select public.recompute_badges(id) from public.profiles;

-- Result: badges awarded so far
select b.name, count(ub.id) as awarded
from public.badges b
left join public.user_badges ub on ub.badge_id = b.id
group by b.name, b.code
order by b.code;
