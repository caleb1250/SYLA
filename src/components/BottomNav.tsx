"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Calendar, Users, User } from "lucide-react";

const items = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/learn", label: "커리큘럼", icon: BookOpen },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/group", label: "소그룹", icon: Users },
  { href: "/profile", label: "프로필", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2 text-[11px]"
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              <Icon size={20} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
