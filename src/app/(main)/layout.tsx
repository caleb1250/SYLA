import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import HeaderBell from "@/components/HeaderBell";
import { getCurrentUserAndProfile } from "@/lib/current-user";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();
  const { count: ledGroups } = user
    ? await supabase.from("groups").select("id", { count: "exact", head: true }).eq("leader_id", user.id)
    : { count: 0 };

  return (
    <div className="flex flex-1 flex-col mx-auto w-full max-w-md">
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="SYLA" width={26} height={26} className="rounded-md" />
          <span className="font-medium text-base">SYLA</span>
        </div>
        <HeaderBell isAdmin={profile?.role === "admin"} isLeader={(ledGroups ?? 0) > 0} />
      </header>
      <main className="flex-1 px-4 pb-4">{children}</main>
      <BottomNav />
    </div>
  );
}
