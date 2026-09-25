import Link from "next/link";
import { Settings2 } from "lucide-react";

export default function HeaderBell({ isAdmin }: { isAdmin?: boolean }) {
  if (!isAdmin) return null;
  return (
    <Link href="/admin" className="text-muted" aria-label="관리자 화면">
      <Settings2 size={18} strokeWidth={1.75} />
    </Link>
  );
}
