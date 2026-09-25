export type Role = "student" | "leader" | "admin";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  avatar_color: string;
  group_id: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  leader_id: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  theme: string | null;
  sort_order: number;
  created_at: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  subtitle: string | null;
  video_url: string | null;
  concept: string | null;
  key_scriptures: string | null;
  deep_dive: string | null;
  personal_questions: string | null;
  group_questions: string | null;
  action_step: string | null;
  prayer: string | null;
  sort_order: number;
  created_at: string;
};

export type LessonProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
};

/** A student's own work on a session: reflection journal + Action Step proof. */
export type LessonResponse = {
  id: string;
  user_id: string;
  lesson_id: string;
  reflection: string | null;
  action_note: string | null;
  action_done: boolean;
  action_photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type EventType = "orientation" | "bible_study" | "discussion" | "field_trip" | "party" | "general";

export type ChurchEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  starts_at: string;
  location: string | null;
  created_at: string;
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  checkin_date: string;
  bible_reading: boolean;
  meditation: boolean;
  memorization: boolean;
  pray_note: boolean;
};

export type Attendance = {
  id: string;
  event_id: string;
  user_id: string;
  checked_in_at: string;
};

export type Badge = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  created_at: string;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  badges?: Badge;
};
