import { getCurrentUserAndProfile } from "@/lib/current-user";
import { AnnouncementForm, AnnouncementList } from "@/components/AnnouncementComposer";
import type { Announcement, Group } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const { supabase } = await getCurrentUserAndProfile();
  const [{ data: groups }, { data: items }] = await Promise.all([
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
    supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Announcement[]>(),
  ]);
  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted leading-5">
        전체 공지는 모든 학생의 홈 화면에, 소그룹 공지는 그 소그룹 학생들에게만 30일 동안 보여요. 상단 고정한 공지가 먼저 나와요.
      </p>
      <AnnouncementForm groups={groups ?? []} allowGlobal path="/admin/announcements" />
      <AnnouncementList items={items ?? []} groupNames={groupNames} canDelete={() => true} path="/admin/announcements" />
    </div>
  );
}
