import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/current-user";
import { ChevronLeft } from "lucide-react";

const links = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/courses", label: "커리큘럼" },
  { href: "/admin/events", label: "일정 · 출석" },
  { href: "/admin/groups", label: "소그룹" },
  { href: "/admin/badges", label: "배지" },
  { href: "/admin/announcements", label: "공지" },
  { href: "/leader", label: "리더 대시보드" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-muted">관리자만 접근할 수 있어요.</p>
        <Link href="/home" className="text-accent text-sm font-medium mt-3">
          홈으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col mx-auto w-full max-w-2xl px-4">
      <header className="flex items-center gap-2 py-3 sticky top-0 bg-background z-10">
        <Link href="/home" className="text-muted">
          <ChevronLeft size={18} />
        </Link>
        <span className="font-medium text-base">관리자</span>
      </header>
      <nav className="flex gap-1 overflow-x-auto pb-2 mb-2 border-b border-border">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[13px] px-3 py-1.5 rounded-full border border-border whitespace-nowrap"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 pb-8">{children}</main>
    </div>
  );
}
