-- ============================================================
-- SYLA migration 2026-09-27 · Stage 3: leaders & admins
-- Run once in Supabase → SQL Editor, AFTER 20260926_02.
-- Safe to re-run.
--
--  1. Small-group leaders can read their members' check-ins, progress
--     and attendance, and mark attendance for their members.
--  2. Attendance codes: every event gets a 4-digit code (visible only to
--     admins and leaders). Students check in through check_in(), which
--     verifies the time window AND the code, with 5 wrong tries max.
--  3. Announcements (whole academy, or one small group).
--  4. Feedback: leaders/admins can comment on a student's session response.
-- ============================================================

-- ---------- helpers ----------
create or replace function public.leads_group(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.groups where id = g and leader_id = auth.uid());
$$;

create or replace function public.is_any_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.groups where leader_id = auth.uid());
$$;

-- ---------- 1. leader read access ----------
drop policy if exists "checkins_select_leader" on public.daily_checkins;
create policy "checkins_select_leader" on public.daily_checkins
  for select using (public.is_leader_of(user_id::text));

drop policy if exists "progress_select_leader" on public.lesson_progress;
create policy "progress_select_leader" on public.lesson_progress
  for select using (public.is_leader_of(user_id::text));

drop policy if exists "attendance_select_leader" on public.attendance;
create policy "attendance_select_leader" on public.attendance
  for select using (public.is_leader_of(user_id::text));

drop policy if exists "user_badges_select_leader" on public.user_badges;
create policy "user_badges_select_leader" on public.user_badges
  for select using (public.is_leader_of(user_id::text));

-- ---------- 2. attendance codes ----------
create table if not exists public.event_checkin_codes (
  event_id uuid primary key references public.events(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);
alter table public.event_checkin_codes enable row level security;

drop policy if exists "codes_select_admin_leader" on public.event_checkin_codes;
create policy "codes_select_admin_leader" on public.event_checkin_codes
  for select using (public.is_admin() or public.is_any_leader());

drop policy if exists "codes_write_admin" on public.event_checkin_codes;
create policy "codes_write_admin" on public.event_checkin_codes
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.random_checkin_code()
returns text
language sql
volatile
as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
$$;

create or replace function public.events_create_checkin_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_checkin_codes (event_id, code)
  values (new.id, public.random_checkin_code())
  on conflict (event_id) do nothing;
  return null;
end;
$$;

drop trigger if exists events_checkin_code on public.events;
create trigger events_checkin_code
  after insert on public.events
  for each row execute function public.events_create_checkin_code();

insert into public.event_checkin_codes (event_id, code)
select id, public.random_checkin_code() from public.events
on conflict (event_id) do nothing;

create table if not exists public.checkin_attempts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  failures int not null default 0,
  primary key (user_id, event_id)
);
alter table public.checkin_attempts enable row level security;
-- no policies: only check_in() (security definer) touches this table

-- Returns: 'ok' | 'already' | 'not_open' | 'closed' | 'bad_code' | 'locked' | 'not_found' | 'signed_out'
create or replace function public.check_in(p_event uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  starts timestamptz;
  fails int;
begin
  if uid is null then
    return 'signed_out';
  end if;

  select starts_at into starts from public.events where id = p_event;
  if not found then
    return 'not_found';
  end if;

  if exists (select 1 from public.attendance where event_id = p_event and user_id = uid) then
    return 'already';
  end if;

  if now() < starts - interval '60 minutes' then
    return 'not_open';
  end if;
  if now() > starts + interval '180 minutes' then
    return 'closed';
  end if;

  select failures into fails from public.checkin_attempts where user_id = uid and event_id = p_event;
  if coalesce(fails, 0) >= 5 then
    return 'locked';
  end if;

  if not exists (
    select 1 from public.event_checkin_codes
    where event_id = p_event and code = btrim(coalesce(p_code, ''))
  ) then
    insert into public.checkin_attempts (user_id, event_id, failures)
    values (uid, p_event, 1)
    on conflict (user_id, event_id) do update set failures = public.checkin_attempts.failures + 1;
    return 'bad_code';
  end if;

  insert into public.attendance (event_id, user_id)
  values (p_event, uid)
  on conflict (event_id, user_id) do nothing;
  return 'ok';
end;
$$;

revoke execute on function public.check_in(uuid, text) from public, anon;
grant execute on function public.check_in(uuid, text) to authenticated;

-- Students no longer insert attendance directly (only through check_in()).
-- Admins can mark anyone; leaders can mark their own group members.
drop policy if exists "attendance_insert_own_or_admin" on public.attendance;
drop policy if exists "attendance_insert_admin_leader" on public.attendance;
create policy "attendance_insert_admin_leader" on public.attendance
  for insert with check (public.is_admin() or public.is_leader_of(user_id::text));

drop policy if exists "attendance_delete_admin" on public.attendance;
drop policy if exists "attendance_delete_admin_leader" on public.attendance;
create policy "attendance_delete_admin_leader" on public.attendance
  for delete using (public.is_admin() or public.is_leader_of(user_id::text));

-- ---------- 3. announcements ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  body text,
  group_id uuid references public.groups(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);
alter table public.announcements enable row level security;

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select using (
    auth.uid() is not null
    and (
      group_id is null
      or public.is_admin()
      or public.leads_group(group_id)
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.group_id = announcements.group_id)
    )
  );

drop policy if exists "announcements_insert" on public.announcements;
create policy "announcements_insert" on public.announcements
  for insert with check (
    author_id = auth.uid()
    and (public.is_admin() or (group_id is not null and public.leads_group(group_id)))
  );

drop policy if exists "announcements_update" on public.announcements;
create policy "announcements_update" on public.announcements
  for update using (public.is_admin() or author_id = auth.uid())
  with check (public.is_admin() or (author_id = auth.uid() and group_id is not null and public.leads_group(group_id)));

drop policy if exists "announcements_delete" on public.announcements;
create policy "announcements_delete" on public.announcements
  for delete using (public.is_admin() or author_id = auth.uid());

-- ---------- 4. feedback on session responses ----------
create table if not exists public.response_feedback (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.lesson_responses(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists response_feedback_response_idx on public.response_feedback (response_id);
alter table public.response_feedback enable row level security;

drop policy if exists "feedback_select" on public.response_feedback;
create policy "feedback_select" on public.response_feedback
  for select using (
    public.is_admin()
    or author_id = auth.uid()
    or exists (
      select 1 from public.lesson_responses r
      where r.id = response_id
        and (r.user_id = auth.uid() or public.is_leader_of(r.user_id::text))
    )
  );

drop policy if exists "feedback_insert" on public.response_feedback;
create policy "feedback_insert" on public.response_feedback
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.lesson_responses r
      where r.id = response_id
        and (public.is_admin() or public.is_leader_of(r.user_id::text))
    )
  );

drop policy if exists "feedback_delete" on public.response_feedback;
create policy "feedback_delete" on public.response_feedback
  for delete using (public.is_admin() or author_id = auth.uid());

-- Check
select (select count(*) from public.event_checkin_codes) as events_with_codes,
       (select count(*) from public.events) as events_total;
