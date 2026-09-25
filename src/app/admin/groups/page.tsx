import { getCurrentUserAndProfile } from "@/lib/current-user";
import type { Group, Profile } from "@/lib/types";
import { createGroup, setMemberGroup, setGroupLeader } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const { supabase } = await getCurrentUserAndProfile();

  const { data: groups } = await supabase.from("groups").select("*").order("name").returns<Group[]>();
  const { data: members } = await supabase.from("profiles").select("*").order("full_name").returns<Profile[]>();

  return (
    <div className="flex flex-col gap-6">
      <form action={createGroup} className="flex gap-2">
        <input
          name="name"
          placeholder="새 소그룹 이름"
          required
          className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-accent"
        />
        <button className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-medium">추가</button>
      </form>

      <div className="flex flex-col gap-3">
        {(groups ?? []).map((g) => {
          const groupMembers = (members ?? []).filter((m) => m.group_id === g.id);
          return (
            <div key={g.id} className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-[13px] font-medium mb-2">{g.name}</p>
              <form action={setGroupLeader} className="flex items-center gap-2 mb-3">
                <input type="hidden" name="group_id" value={g.id} />
                <span className="text-xs text-muted shrink-0">리더</span>
                <select name="leader_id" defaultValue={g.leader_id ?? ""} className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs">
                  <option value="">미지정</option>
                  {groupMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <button className="text-xs text-accent shrink-0">저장</button>
              </form>
              <div className="flex flex-col gap-1">
                {groupMembers.map((m) => (
                  <p key={m.id} className="text-xs text-muted">
                    · {m.full_name} {m.id === g.leader_id ? "(리더)" : ""}
                  </p>
                ))}
                {groupMembers.length === 0 && <p className="text-xs text-muted">아직 그룹원이 없어요.</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-[13px] font-medium mb-2">전체 학생 · 소그룹 배정</p>
        <div className="flex flex-col gap-2">
          {(members ?? []).map((m) => (
            <form key={m.id} action={setMemberGroup} className="flex items-center gap-2">
              <input type="hidden" name="user_id" value={m.id} />
              <span className="text-[13px] flex-1">{m.full_name}</span>
              <select name="group_id" defaultValue={m.group_id ?? ""} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                <option value="">미배정</option>
                {(groups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button className="text-xs text-accent">저장</button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
