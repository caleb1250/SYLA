import { notFound } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import type { Badge, Profile } from "@/lib/types";
import { toggleBadge } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminBadgeDetailPage({ params }: { params: Promise<{ badgeId: string }> }) {
  const { badgeId } = await params;
  const { supabase } = await getCurrentUserAndProfile();

  const { data: badge } = await supabase.from("badges").select("*").eq("id", badgeId).single<Badge>();
  if (!badge) notFound();

  const { data: members } = await supabase.from("profiles").select("*").order("full_name").returns<Profile[]>();
  const { data: userBadges } = await supabase.from("user_badges").select("user_id").eq("badge_id", badgeId);
  const awardedIds = new Set((userBadges ?? []).map((u) => u.user_id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[15px] font-medium">{badge.name}</p>
        {badge.description && <p className="text-xs text-muted mt-0.5">{badge.description}</p>}
      </div>

      <div className="flex flex-col gap-1">
        {(members ?? []).map((m) => {
          const awarded = awardedIds.has(m.id);
          return (
            <form key={m.id} action={toggleBadge} className="flex items-center justify-between py-1.5 border-t border-border first:border-t-0">
              <input type="hidden" name="badge_id" value={badgeId} />
              <input type="hidden" name="user_id" value={m.id} />
              <input type="hidden" name="awarded" value={String(awarded)} />
              <span className="text-[13px]">{m.full_name}</span>
              <button
                className="text-xs rounded-full px-3 py-1"
                style={{
                  background: awarded ? "var(--accent-bg)" : "var(--card)",
                  color: awarded ? "var(--accent-fg)" : "var(--muted)",
                  border: awarded ? "none" : "1px solid var(--border)",
                }}
              >
                {awarded ? "수여됨" : "수여하기"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
