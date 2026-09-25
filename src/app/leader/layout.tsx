import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getLeaderContext } from "@/lib/leader";

export default async function LeaderLayout({ children }: { children: React.ReactNode }) {
  const { canLead } = await getLeaderContext();

  if (!canLead) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-muted">소그룹 리더와 관리자만 볼 수 있어요.</p>
        <Link href="/home" className="text-accent text-sm font-medium mt-3">
          홈으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col mx-auto w-full max-w-2xl px-4">
      <header className="flex items-center gap-2 py-3 sticky top-0 bg-background z-10">
        <Link href="/home" className="text-muted" aria-label="홈으로">
          <ChevronLeft size={18} />
        </Link>
        <Link href="/leader" className="font-medium text-base">
          리더
        </Link>
      </header>
      <main className="flex-1 pb-8">{children}</main>
    </div>
  );
}
