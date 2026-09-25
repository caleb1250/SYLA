# SYLA 러닝 플랫폼

Servant Youth Leadership Academy를 위한 학습 플랫폼 PWA (설치형 웹앱)입니다.

기능: 커리큘럼(Bible Study 36 Session + 독서와 통찰 토론반), 모듈별 세션 목록 · 이어서 학습하기, 묵상 노트(질문에 직접 답 쓰기), Action Step 실천 인증(기록 · 사진), 출석 체크 & 캘린더, 소그룹 관리, 진도 추적 & 배지, 자기 주도 학습 자가 체크(성경읽기 · 말씀묵상 · 말씀암송 · P.R.A.Y 노트).

기술 스택: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, Supabase (DB · Auth · Storage · RLS), Vercel 배포. 이 규모(학생 20~50명)에서는 두 서비스 모두 무료 티어로 충분합니다.

## 배포 방식

이 저장소의 `main` 브랜치에 코드가 올라가면 Vercel이 자동으로 새 버전을 배포합니다. Supabase 주소와 키는 Vercel 프로젝트의 **Settings → Environment Variables**에 저장되어 있고, 저장소에는 넣지 않습니다.

## 1. Supabase 설정

1. Supabase 대시보드 → **SQL Editor**를 엽니다.
2. 새 프로젝트라면 `supabase/schema.sql` 전체를 붙여넣고 실행합니다. (테이블, 보안 정책, 실제 SYLA 커리큘럼 36개 세션과 학사일정이 함께 생성됩니다.)
3. 그다음 `supabase/migrations/` 폴더의 파일을 **이름 순서대로** 하나씩 실행합니다. 이미 운영 중인 프로젝트라면 아직 실행하지 않은 마이그레이션만 실행하면 됩니다. 모든 마이그레이션은 여러 번 실행해도 안전합니다.

| 마이그레이션 | 내용 |
|---|---|
| `20260925_01_security_and_lesson_responses.sql` | 학생이 스스로 관리자 권한을 얻지 못하도록 차단 · 출석 체크 시간 제한(모임 1시간 전~3시간 후) · 자가 체크 날짜를 미국 동부 시간 기준으로 · 묵상 노트/Action Step 테이블 · 인증 사진 저장소 |
| `20260926_02_auto_badges.sql` | 배지 자동 지급(첫 출석, 출석 10회, 7일 연속 QT, 30일 연속 체크, 묵상 노트 5편, Action Step 5회, 모듈 완주, 과정 수료) · 기존 기록 기준으로 소급 지급 |
| `20260927_03_leaders_checkin_announcements.sql` | 소그룹 리더 권한(그룹원 체크·진도·출석 열람, 출석 처리) · 모임별 4자리 출석 코드(학생은 코드로만 출석, 5회 오답 시 잠금) · 공지 · 묵상 노트 피드백 |

## 2. 로컬에서 실행하기

```bash
npm install
cp .env.local.example .env.local
# .env.local 파일을 열어 Supabase Project URL / anon public key를 입력
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

## 3. 관리자(admin) · 리더 계정

1. 앱에서 본인 계정으로 회원가입합니다.
2. Supabase 대시보드 → **Table Editor → profiles**에서 본인 행의 `role`을 `admin`으로 바꿉니다. (보안상 앱 안에서는 학생이 자기 역할을 바꿀 수 없고, 대시보드나 관리자만 바꿀 수 있어요.)
3. 다시 로그인하면 화면 오른쪽 위에 관리자 아이콘이 나타납니다.

소그룹 리더는 `/admin/groups`에서 그룹의 리더로 지정하면 화면 오른쪽 위에 리더 아이콘이 생기고, `/leader`에서 그룹원의 자가 체크·진도·출석을 보고, 묵상 노트와 Action Step에 피드백을 남기고, 소그룹 공지를 올릴 수 있어요.

## 출석 체크 방식

모든 일정에는 4자리 출석 코드가 자동으로 만들어져요. 모임에서 리더나 관리자가 `/leader` → "출석 코드 띄우기"(또는 관리자 일정 화면의 "출석 코드 · QR 띄우기")를 열어 화면을 보여주면, 학생은 QR을 찍거나 앱에 코드를 입력해 출석해요. 출석은 모임 1시간 전부터 시작 3시간 후까지만 가능하고, 코드를 5번 틀리면 그 모임은 잠겨서 리더가 직접 출석 처리해야 해요.

## 4. 콘텐츠 채워넣기

`/admin/courses`에서 각 세션을 눌러 개념, 핵심 말씀, 본문 탐구, 묵상 질문, 소그룹 토론 질문, Action Step, 기도문을 입력합니다. 영상은 YouTube · Vimeo · Google Drive 공유 링크를 그대로 붙여넣으면 앱 안에서 재생됩니다.

일정은 `/admin/events`(미국 동부 시간 기준 입력), 소그룹 배정은 `/admin/groups`, 배지는 `/admin/badges`에서 관리합니다.

배지는 학생 활동에 따라 데이터베이스가 자동으로 지급합니다(학생이 직접 지급할 수는 없어요). 관리자는 `/admin/badges`에서 언제든 직접 수여하거나 회수할 수 있고, 새로 만든 배지는 직접 수여용입니다.

## 폴더 구조

```
src/app/(main)/       홈 · 커리큘럼 · 캘린더 · 소그룹 · 프로필 (학생용, 하단 탭)
src/app/admin/        관리자 전용 화면
src/app/leader/       소그룹 리더 화면 (대시보드 · 그룹원 상세 · 출석 코드)
src/app/login, signup 로그인 · 회원가입
src/components/       공용 UI 컴포넌트 (묵상 노트, Action Step 카드 등)
src/lib/curriculum.ts 커리큘럼 트리 · 진도 · 다음 세션 계산
src/lib/date.ts       미국 동부 시간 기준 날짜 처리 · 출석 가능 시간
src/lib/video.ts      영상 링크 → 임베드 주소 변환
src/lib/supabase/     Supabase 클라이언트 (브라우저 · 서버 · 세션 갱신)
src/proxy.ts          로그인 확인 (Next.js 16의 middleware)
supabase/schema.sql   초기 DB 스키마 + 커리큘럼 시드 데이터
supabase/migrations/  이후 DB 변경 사항 (순서대로 실행)
```

## 로드맵

- [x] 0단계: GitHub 이전, 보안 수정, 시간대 버그 수정
- [x] 1단계: 세션 목록 · 이어서 학습하기 · 묵상 노트 · Action Step 인증 · 영상 링크 변환
- [x] 2단계: 연속 체크 기록, 월간 활동 달력, 배지 자동 지급, 2년 여정 타임라인
- [x] 3단계: 리더용 소그룹 대시보드, 출석 코드/QR, 공지, 답안 피드백
- [ ] 4단계: 홈 화면 재구성, 다크모드, 로딩 · 빈 화면 개선
