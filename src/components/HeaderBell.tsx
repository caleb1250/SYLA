import Link from "next/link";
import { ClipboardList, Settings2 } from "lucide-react";

export default function HeaderBell({ isAdmin, isLeader }: { isAdmin?: boolean; isLeader?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {(isLeader || isAdmin) && (
        <Link href="/leader" className="text-muted" aria-label="리더 화면">
          <ClipboardList size={18} strokeWidth={1.75} />
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className="text-muted" aria-label="관리자 화면">
          <Settings2 size={18} strokeWidth={1.75} />
        </Link>
      )}
    </div>
  );
}
