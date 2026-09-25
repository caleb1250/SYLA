-- ============================================================
-- Servant Youth Leadership Academy - Learning Platform
-- Supabase schema (Postgres). Run in Supabase SQL editor.
--
-- Content hierarchy matches the actual SYLA curriculum:
--   course (트랙, e.g. "Bible Study 커리큘럼" / "독서와 통찰 토론반")
--     -> module (학기 + 모듈, e.g. "Semester 1 · Module 1: 창조주의 존재와 나의 존재 가치")
--       -> lesson (개별 Session, 풍부한 콘텐츠 필드 포함)
--
-- After this file, run every file in supabase/migrations/ in name order.
-- ============================================================

-- ---------- profiles (extends auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('student', 'leader', 'admin')),
  avatar_color text default 'blue',
  group_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- groups (소그룹) ----------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_group_fk foreign key (group_id) references public.groups(id) on delete set null;

-- ---------- courses (트랙) ----------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- modules (학기 · 모듈) ----------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  theme text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- lessons (개별 Session) ----------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  subtitle text,
  video_url text,
  concept text,
  key_scriptures text,
  deep_dive text,
  personal_questions text,
  group_questions text,
  action_step text,
  prayer text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- ---------- events & attendance (출석 체크 & 캘린더) ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'general'
    check (event_type in ('orientation', 'bible_study', 'discussion', 'field_trip', 'party', 'general')),
  starts_at timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ---------- daily check-ins (자기 주도 학습: 성경읽기 · 말씀묵상 · 말씀암송 · P.R.A.Y 노트) ----------
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  bible_reading boolean not null default false,
  meditation boolean not null default false,
  memorization boolean not null default false,
  pray_note boolean not null default false,
  unique (user_id, checkin_date)
);

-- ---------- badges (배지 / 인증) ----------
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text not null default 'award',
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: everyone signed-in can read all profiles (small church group), only self or admin can update
-- (role / group_id changes are further restricted to admins by a trigger — see migrations/)
create policy "profiles_select_all" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self_or_admin" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- groups: readable by all signed-in users, writable by admin
create policy "groups_select_all" on public.groups for select using (auth.uid() is not null);
create policy "groups_write_admin" on public.groups for all using (public.is_admin()) with check (public.is_admin());

-- courses / modules / lessons: readable by all signed-in users, writable by admin
create policy "courses_select_all" on public.courses for select using (auth.uid() is not null);
create policy "courses_write_admin" on public.courses for all using (public.is_admin()) with check (public.is_admin());
create policy "modules_select_all" on public.modules for select using (auth.uid() is not null);
create policy "modules_write_admin" on public.modules for all using (public.is_admin()) with check (public.is_admin());
create policy "lessons_select_all" on public.lessons for select using (auth.uid() is not null);
create policy "lessons_write_admin" on public.lessons for all using (public.is_admin()) with check (public.is_admin());

-- lesson_progress: users manage their own progress, admin can read all
create policy "progress_select_own_or_admin" on public.lesson_progress for select using (auth.uid() = user_id or public.is_admin());
create policy "progress_insert_own" on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.lesson_progress for update using (auth.uid() = user_id);

-- events: readable by all, writable by admin
create policy "events_select_all" on public.events for select using (auth.uid() is not null);
create policy "events_write_admin" on public.events for all using (public.is_admin()) with check (public.is_admin());

-- attendance: users can check themselves in and read their own; admin can read/write all
create policy "attendance_select_own_or_admin" on public.attendance for select using (auth.uid() = user_id or public.is_admin());
create policy "attendance_insert_own_or_admin" on public.attendance for insert with check (auth.uid() = user_id or public.is_admin());
create policy "attendance_write_admin" on public.attendance for update using (public.is_admin());
create policy "attendance_delete_admin" on public.attendance for delete using (public.is_admin());

-- daily_checkins: users manage their own, admin can read all
create policy "checkins_select_own_or_admin" on public.daily_checkins for select using (auth.uid() = user_id or public.is_admin());
create policy "checkins_insert_own" on public.daily_checkins for insert with check (auth.uid() = user_id);
create policy "checkins_update_own" on public.daily_checkins for update using (auth.uid() = user_id);

-- badges: readable by all, writable by admin
create policy "badges_select_all" on public.badges for select using (auth.uid() is not null);
create policy "badges_write_admin" on public.badges for all using (public.is_admin()) with check (public.is_admin());

-- user_badges: users read their own, admin reads/writes all
create policy "user_badges_select_own_or_admin" on public.user_badges for select using (auth.uid() = user_id or public.is_admin());
create policy "user_badges_write_admin" on public.user_badges for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Seed data: real SYLA 2-year Bible Study curriculum (36 sessions)
-- + 독서와 통찰 토론반 track. Only Session 1 has full content filled in
-- as a worked example (from the "Sample Model" doc) - fill in the rest
-- from /admin/courses as content is finalized.
-- ============================================================
insert into public.badges (name, description, icon) values
  ('첫 출석', '첫 모임에 출석했어요', 'award'),
  ('7일 연속 QT', '7일 연속 묵상을 완료했어요', 'flame'),
  ('과정 수료', '커리큘럼 한 과정을 모두 마쳤어요', 'certificate')
on conflict do nothing;

do $$
declare
  bible_course_id uuid;
  discussion_course_id uuid;
  m_id uuid;
begin
  insert into public.courses (title, description, sort_order)
  values ('Bible Study 커리큘럼 (2년 · 4학기)', '창조와 정체성 → 타락과 분별 → 구속과 제자도 → 회복과 공적 리더십, 총 36 Session', 1)
  returning id into bible_course_id;

  insert into public.courses (title, description, sort_order)
  values ('독서와 통찰 토론반', '매월 1회, 필독서를 읽고 나누는 토론 세션 (총 3 Session)', 2)
  returning id into discussion_course_id;

  -- Semester 1: 창조와 정체성 (Creation & Identity)
  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 1 · Module 1: 창조주의 존재와 나의 존재 가치 (God & My Identity)',
    '나와 세상의 근원을 이해하고, 창조주의 눈으로 존재 가치를 재정의한다.', 1)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, concept, key_scriptures, deep_dive, personal_questions, group_questions, action_step, prayer, sort_order) values
  (m_id, 'Session 1', '[원형] 모든 것의 시작, 창조주 하나님',
   E'개념: 우연과 진화론적 프레임을 넘어, 목적과 뜻을 가진 창조주의 존재를 인지한다.\n확장: ''나''라는 존재가 우연의 산물이 아닌 하나님이 디자인하신 작품임을 고백한다.',
   E'창세기 1:1 - "태초에 하나님이 천지를 창조하시니라"\n히브리서 11:3 - "믿음으로 모든 세계가 하나님의 말씀으로 지어진 줄을 우리가 아나니..."\n골로새서 1:16 - "만물이 그에게서 창조되되... 그를 위하여 창조되었고"',
   E'1. ''바라(Bara)''의 창조 - 무(Nothing)에서 유(Something)로: 하나님만이 주어로 쓰이는 창조 동사. 인간은 재조합할 뿐이지만 하나님은 말씀으로 무에서 창조하셨다.\n2. 우주의 주인이 누구인가?: 세상의 시작을 하나님으로 인정하는 순간, 내 삶의 주권도 하나님께 있음을 깨닫는다.',
   E'1. [세계관 대조] 학교에서 배우는 세상의 시작(우연, 빅뱅, 진화)과 성경의 창조를 접할 때 내 마음에 어떤 충돌이 생기나요?\n2. [존재 가치] 내가 하나님이 목적을 두고 디자인하신 존재라면, 나의 하루를 대하는 태도는 어떻게 달라져야 할까요?',
   E'Q1 (정체성): 세상은 시험 점수, 외모, SNS 좋아요 수로 우리 가치를 평가합니다. 창세기 1:1의 창조주 신앙은 이 세속적 평가 프레임을 어떻게 허물어 주나요?\nQ2 (변증): 친구가 "하나님이 세상을 만들었다는 걸 어떻게 증명해?"라고 물으면 어떻게 답할까요?\nQ3 (리더십): 학교, 가정, 커뮤니티에서 하나님의 성품을 드러내기 위해 이번 주 할 수 있는 실천은 무엇일까요?',
   '이번 주 하늘, 나무, 혹은 내 손을 가만히 바라보며 하나님이 창조하신 아름다움을 묵상하고, 감사 고백을 사진/글로 저널에 1회 이상 남기기.',
   '우주 만물의 주인이시며 나의 창조주이신 하나님, 세상의 소리에 휘둘리지 않고 하나님이 나를 특별하게 만드셨음을 믿게 하소서. 내 삶의 주인이 하나님이심을 고백하며, 이번 한 주도 창조주의 뜻에 맞는 거룩한 리더로 살아가게 도와주소서. 예수님의 이름으로 기도합니다. 아멘.',
   1),
  (m_id, 'Session 2', '[형상] 하나님의 형상(Imago Dei)과 인간의 존엄', E'개념: 세상의 성과주의/외모지상주의 평가를 허물고, 존재 자체의 고귀함을 배운다.\n확장: 내 안의 가치뿐 아니라 타인의 존엄성을 인정하고 배려하는 인격을 형성한다.', null, null, null, null, null, null, 2),
  (m_id, 'Session 3', '[소명] 동산지기: 세상을 관리하는 청지기', E'개념: 내 삶, 시간, 달란트, 물질의 주권이 하나님께 있음을 배운다.\n확장: 피조세계와 환경, 내 삶의 자원을 관리하는 거룩한 청지기적 책임을 확립한다.', null, null, null, null, null, null, 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 1 · Module 2: 관계의 질서와 문화적 성품 (Relational Order & Culture)', null, 2)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 4', '[공동체] 혼자가 아닌 함께: 가정과 관계의 탄생', 1),
  (m_id, 'Session 5', '[성(Sexuality)] 성과 정체성에 관한 성경적 기준', 2),
  (m_id, 'Session 6', '[안식과 질서] 시간의 주인과 삶의 리듬', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 1 · Module 3: 언약과 신앙의 유산 (Covenant & Spiritual Legacy)', null, 3)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 7', '[언약] 변함없는 약속과 신실하신 하나님', 1),
  (m_id, 'Session 8', '[섭리] 고난 뒤에 숨겨진 하나님의 커다란 그림', 2),
  (m_id, 'Session 9', '[해방과 법] 출애굽의 구원과 은혜의 법률', 3);

  -- Semester 2: 타락과 세속 가치관 분별 (Fall & Discernment)
  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 2 · Module 1: 죄의 본질과 자아의 우상 (Nature of Sin & Idolatry)',
    '세상의 깨어짐과 우상을 직시하고, 성경적 비판 의식으로 세속 문화를 분별한다.', 4)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 10', '[타락] 불순종과 관계의 깨어짐', 1),
  (m_id, 'Session 11', '[우상숭배] 하나님 자리에 둔 현대의 우상들', 2),
  (m_id, 'Session 12', '[상대주의] "하나님이 정말 그렇게 말씀하셨느냐?"', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 2 · Module 2: 세속 문화와 미디어 분별 (Cultural Discernment)', null, 5)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 13', '[미디어와 팝컬처] 숏폼과 미디어 속 프레임 해독', 1),
  (m_id, 'Session 14', '[물질주의와 비교] 인스타그램 시대의 자존감', 2),
  (m_id, 'Session 15', '[중독과 도피] 욕망의 통제와 참된 자유', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 2 · Module 3: 세상 한가운데서의 거룩 (Holiness in the World)', null, 6)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 16', '[타협과 동조] 세속적 또래 압박 극복하기', 1),
  (m_id, 'Session 17', '[다니엘의 거룩] 타문화 속에서 뜻을 정한 용기', 2),
  (m_id, 'Session 18', '[남은 자의 소망] 어두운 시대 속 빛으로 남아있기', 3);

  -- Semester 3: 구속과 제자도 (Redemption & Discipleship)
  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 3 · Module 1: 십자가의 복음과 새로운 신분 (Gospel & New Identity)',
    '십자가의 은혜를 깊이 체험하고, 예수 그리스도를 따르는 제자로 성숙한다.', 7)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 19', '[성육신] 낮아짐의 영성: 높음만을 쫓는 세상에 대한 도전', 1),
  (m_id, 'Session 20', '[십자가와 은혜] 자격 없는 자에게 주어진 완전한 사랑', 2),
  (m_id, 'Session 21', '[부활과 소망] 죽음을 이긴 승리와 새로운 삶', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 3 · Module 2: 성화와 제자로서의 성숙 (Sanctification & Maturity)', null, 8)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 22', '[회개와 용서] 마음을 찢고 관계를 허무는 힘', 1),
  (m_id, 'Session 23', '[자기 부인] 자기 십자가를 지고 예수를 따름', 2),
  (m_id, 'Session 24', '[성령과 열매] 내주하시는 성령님과 성품의 변화', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 3 · Module 3: 영적 전쟁과 경건의 루틴 (Spiritual Warfare & Habits)', null, 9)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 25', '[말씀과 기도] 하나님과 깊이 소통하는 삶의 밧줄', 1),
  (m_id, 'Session 26', '[전신갑주] 주중 삶의 현장에서 치르는 영적 전쟁', 2),
  (m_id, 'Session 27', '[증인] 내가 만난 예수를 세상에 담대히 선포하기', 3);

  -- Semester 4: 회복과 공적 리더십 (Restoration & Leadership)
  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 4 · Module 1: 교회와 하나님 나라 (Church & Kingdom of God)',
    '하나님 나라의 비전을 품고, 세상 한복판에서 영향력 있는 리더로 일어선다.', 10)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 28', '[교회] 세상의 거룩한 대안 공동체', 1),
  (m_id, 'Session 29', '[하나님 나라] 이미 왔으나 아직 완성되지 않은 나라', 2),
  (m_id, 'Session 30', '[공의와 긍휼] 세상을 바로잡는 하나님의 정의', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 4 · Module 2: 세상을 변혁하는 공적 소명 (Public Vocation & Impact)', null, 11)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 31', '[소명과 일] 일터, 학교, 가정이 곧 나의 사역지', 1),
  (m_id, 'Session 32', '[이중정체성] 미주 한인 2세로서의 공적 책임과 문화적 가교', 2),
  (m_id, 'Session 33', '[첨단 기술과 지혜] AI 시대와 미디어 세상을 대하는 그리스도인', 3);

  insert into public.modules (course_id, title, theme, sort_order)
  values (bible_course_id, 'Semester 4 · Module 3: 완성될 소망과 파송 (Consummation & Sending)', null, 12)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Session 34', '[마지막 때와 재림] 다시 오실 왕을 기다리는 소망', 1),
  (m_id, 'Session 35', '[성장 포트폴리오와 소명문] 2년간의 영적 발자취 정리', 2),
  (m_id, 'Session 36', '[파송과 대사명] 세상 한복판으로 나아가는 크리스천 리더', 3);

  -- 독서와 통찰 토론반: 필독서 기반 3 Session (책 제목은 확정되는 대로 /admin 에서 채워넣기)
  insert into public.modules (course_id, title, theme, sort_order)
  values (discussion_course_id, '독서와 통찰 토론 세션', '월 1회, 필독서를 읽고 준비하여 토론한다.', 1)
  returning id into m_id;

  insert into public.lessons (module_id, title, subtitle, sort_order) values
  (m_id, 'Discussion Session 1', '필독서 토론 1 (9/25)', 1),
  (m_id, 'Discussion Session 2', '필독서 토론 2 (10/30)', 2),
  (m_id, 'Discussion Session 3', '필독서 토론 3 (12/4)', 3);
end $$;

-- ---------- Seed events: 실제 학사일정 ----------
insert into public.events (title, description, event_type, starts_at, location) values
  ('Orientation', '학년 오리엔테이션', 'orientation', '2026-08-30 14:00:00-04', 'Unity Hall'),
  ('개강 · Bible Study Session 1', null, 'bible_study', '2026-09-04 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 2', null, 'bible_study', '2026-09-11 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 3', null, 'bible_study', '2026-09-18 18:30:00-04', 'Unity Hall'),
  ('독서와 통찰 Session 1', null, 'discussion', '2026-09-25 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 4', null, 'bible_study', '2026-10-02 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 5', null, 'bible_study', '2026-10-09 18:30:00-04', 'Unity Hall'),
  ('Field Trip 1 (Chick-fil-A)', null, 'field_trip', '2026-10-16 15:00:00-04', 'Chick-fil-A'),
  ('Field Trip 2 (Georgia Tech)', null, 'field_trip', '2026-10-17 10:00:00-04', 'Georgia Tech'),
  ('Bible Study Session 6', null, 'bible_study', '2026-10-23 18:30:00-04', 'Unity Hall'),
  ('독서와 통찰 Session 2', null, 'discussion', '2026-10-30 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 7', null, 'bible_study', '2026-11-06 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 8', null, 'bible_study', '2026-11-13 18:30:00-04', 'Unity Hall'),
  ('Bible Study Session 9', null, 'bible_study', '2026-11-20 18:30:00-04', 'Unity Hall'),
  ('Thanksgiving Break', '모임 없음', 'general', '2026-11-27 18:30:00-04', null),
  ('독서와 통찰 Session 3', null, 'discussion', '2026-12-04 18:30:00-04', 'Unity Hall'),
  ('종강 Party', null, 'party', '2026-12-11 18:30:00-04', 'Unity Hall')
on conflict do nothing;
