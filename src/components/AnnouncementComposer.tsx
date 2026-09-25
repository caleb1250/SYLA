import { createAnnouncement, deleteAnnouncement } from "@/app/leader/actions";
import { formatDate } from "@/lib/date";
import type { Announcement, Group } from "@/lib/types";
import { Pin, Trash2 } from "lucide-react";

/** Post form + list with delete. `groups` = where this user may post; `allowGlobal` for admins. */
export function AnnouncementForm({
  groups,
  allowGlobal,
  fixedGroupId,
  path,
}: {
  groups: Group[];
  allowGlobal: boolean;
  fixedGroupId?: string;
  path: string;
}) {
  return (
    <form action={createAnnouncement} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
      <input type="hidden" name="path" value={path} />
      <input
        name="title"
        required
        placeholder="공지 제목"
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
      />
      <textarea
        name="body"
        rows={3}
        placeholder="내용 (선택)"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center gap-2">
        {fixedGroupId ? (
          <input type="hidden" name="group_id" value={fixedGroupId} />
        ) : (
          <select name="group_id" className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-xs">
            {allowGlobal && <option value="">전체 공지</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}만
              </option>
            ))}
          </select>
        )}
        {allowGlobal && (
          <label className="flex items-center gap-1 text-xs text-muted shrink-0">
            <input type="checkbox" name="pinned" /> 상단 고정
          </label>
        )}
        <button className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium ml-auto shrink-0">올리기</button>
      </div>
    </form>
  );
}

export function AnnouncementList({
  items,
  groupNames,
  canDelete,
  path,
}: {
  items: Announcement[];
  groupNames: Map<string, string>;
  canDelete: (a: Announcement) => boolean;
  path: string;
}) {
  if (items.length === 0) return <p className="text-xs text-muted">아직 공지가 없어요.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted flex items-center gap-1">
                {a.pinned && <Pin size={11} />}
                {a.group_id ? groupNames.get(a.group_id) ?? "소그룹" : "전체"} · {formatDate(a.created_at)}
              </p>
              <p className="text-[13px] font-medium mt-0.5">{a.title}</p>
              {a.body && <p className="text-xs text-muted mt-1 whitespace-pre-line leading-5">{a.body}</p>}
            </div>
            {canDelete(a) && (
              <form action={deleteAnnouncement}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="path" value={path} />
                <button className="text-muted p-1" aria-label="공지 삭제">
                  <Trash2 size={14} />
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
