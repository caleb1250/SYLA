import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { ChevronLeft } from "lucide-react";
import { getLeaderContext } from "@/lib/leader";
import { attendanceWindow, formatDate, formatTime } from "@/lib/date";
import AutoRefresh from "@/components/AutoRefresh";
import type { ChurchEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Screen to project or hold up at the meeting: big 4-digit code + QR that opens the check-in page. */
export default async function CheckinDisplayPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, isAdmin } = await getLeaderContext();

  const [{ data: event }, { data: codeRow }, { data: attendees }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).maybeSingle<ChurchEvent>(),
    supabase.from("event_checkin_codes").select("code").eq("event_id", eventId).maybeSingle<{ code: string }>(),
    supabase
      .from("attendance")
      .select("user_id, checked_in_at, profiles(full_name)")
      .eq("event_id", eventId)
      .order("checked_in_at")
      .returns<{ user_id: string; checked_in_at: string; profiles: { full_name: string } | null }[]>(),
  ]);
  if (!event) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "syla-app-rust.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const code = codeRow?.code ?? null;
  const link = code ? `${proto}://${host}/checkin?e=${event.id}&c=${code}` : null;
  const qrSvg = link
    ? await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0c2d55", light: "#ffffff" } })
    : null;
  const windowState = attendanceWindow(event.starts_at);

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh seconds={10} />
      <Link href="/leader" className="flex items-center gap-1 text-xs text-muted">
        <ChevronLeft size={14} /> 리더
      </Link>

      <div className="text-center">
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-muted">
          {formatDate(event.starts_at, { month: "long", day: "numeric", weekday: "short" })} {formatTime(event.starts_at)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>

      {code ? (
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-4">
          <p className="text-xs text-muted">출석 코드</p>
          <p className="text-6xl font-semibold tracking-[0.3em] pl-[0.3em] tabular-nums" aria-label={`출석 코드 ${code.split("").join(" ")}`}>
            {code}
          </p>
          {qrSvg && (
            <div
              className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full"
              role="img"
              aria-label="출석 체크 QR 코드"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          <p className="text-xs text-muted text-center leading-5">
            휴대폰 카메라로 QR을 찍거나,
            <br />앱의 출석 체크 버튼에 코드를 입력하세요.
          </p>
          {windowState !== "open" && (
            <p className="text-xs text-gold-fg bg-gold-bg rounded-full px-3 py-1">
              {windowState === "before" ? "출석 체크는 모임 1시간 전부터 열려요" : "출석 체크 시간이 지났어요"}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted text-center rounded-xl border border-border p-4">
          이 일정에는 출석 코드가 없어요. Supabase에 최신 마이그레이션이 적용됐는지 확인해주세요.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">
          출석한 학생 {attendees?.length ?? 0}명{!isAdmin && <span className="text-[11px] text-muted font-normal"> · 우리 소그룹 기준</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(attendees ?? []).map((a) => (
            <span key={a.user_id} className="text-xs rounded-full bg-accent-bg text-accent-fg px-2.5 py-1">
              {a.profiles?.full_name ?? "학생"}
            </span>
          ))}
          {(attendees ?? []).length === 0 && <p className="text-xs text-muted">아직 없어요. 10초마다 새로고침돼요.</p>}
        </div>
      </section>
    </div>
  );
}
