import { getCurrentUserAndProfile } from "@/lib/current-user";
import type { Group, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GroupPage() {
  const { profile, supabase } = await getCurrentUserAndProfile();

  if (!profile?.group_id) {
    return (
      <div className="pt-8 text-center">
        <p className="text-sm text-muted">아직 소그룹에 배정되지 않았어요.</p>
        <p className="text-xs text-muted mt-1">리더에게 문의해주세요.</p>
      </div>
    );
  }

  const { data: group } = await supabase.from("groups").select("*").eq("id", profile.group_id).single<Group>();
  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("group_id", profile.group_id)
    .order("full_name")
    .returns<Profile[]>();

  const leader = (members ?? []).find((m) => m.id === group?.leader_id);

  return (
    <div className="flex flex-col gap-1 pt-2">
      <p className="text-[13px] font-medium">{group?.name}</p>
      {leader && <p className="text-xs text-muted mb-3">리더: {leader.full_name}</p>}

      <div className="rounded-xl border border-border bg-card p-3.5 mt-2">
        <p className="text-xs text-muted mb-2.5">그룹원 {members?.length ?? 0}명</p>
        <div className="flex flex-col gap-2.5">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium"
                style={{ background: "var(--accent-bg)", color: "var(--accent-fg)" }}
              >
                {m.full_name.slice(0, 1)}
              </div>
              <span className="text-[13px]">
                {m.full_name}
                {m.id === group?.leader_id && <span className="text-xs text-muted"> · 리더</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
