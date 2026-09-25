import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import type { Badge } from "@/lib/types";
import { createBadge } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const { supabase } = await getCurrentUserAndProfile();
  const { data: badges } = await supabase.from("badges").select("*").returns<Badge[]>();

  return (
    <div className="flex flex-col gap-6">
      <form action={createBadge} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
        <p className="text-[13px] font-medium mb-1">새 배지 추가</p>
        <input name="name" placeholder="배지 이름" required className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <input name="description" placeholder="설명 (선택)" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        <button className="h-10 rounded-lg bg-foreground text-background text-sm font-medium mt-1">추가</button>
      </form>

      <div className="flex flex-col gap-2">
        {(badges ?? []).map((b) => (
          <Link key={b.id} href={`/admin/badges/${b.id}`} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
            <div>
              <p className="text-[13px]">{b.name}</p>
              {b.description && <p className="text-xs text-muted mt-0.5">{b.description}</p>}
            </div>
            <span className="text-xs text-accent">수여 관리</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
