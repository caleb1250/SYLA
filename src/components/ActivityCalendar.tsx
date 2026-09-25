import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CHECKIN_ITEMS, type MonthView } from "@/lib/growth";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function cellStyle(level: number): React.CSSProperties {
  if (level <= 0) return { background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)" };
  return { background: `var(--heat-${Math.min(level, 4)})`, color: level >= 3 ? "white" : "var(--foreground)" };
}

/** Month grid of daily self-check-ins; darker = more of the 4 items checked. */
export default function ActivityCalendar({
  view,
  activity,
  today,
  basePath,
}: {
  view: MonthView;
  activity: Map<string, number>;
  today: string;
  basePath: string;
}) {
  const activeDays = view.weeks.flat().filter((d) => d && activity.has(d)).length;

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`${basePath}?m=${view.prevKey}`}
          scroll={false}
          className="w-7 h-7 flex items-center justify-center text-muted"
          aria-label="이전 달"
        >
          <ChevronLeft size={16} />
        </Link>
        <div className="text-center">
          <p className="text-[13px] font-medium">
            {view.year}년 {view.month}월
          </p>
          <p className="text-[11px] text-muted">{activeDays}일 체크</p>
        </div>
        {view.nextKey ? (
          <Link
            href={`${basePath}?m=${view.nextKey}`}
            scroll={false}
            className="w-7 h-7 flex items-center justify-center text-muted"
            aria-label="다음 달"
          >
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="w-7 h-7" />
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden>
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] text-muted text-center">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${view.year}년 ${view.month}월 자가 체크 기록`}>
        {view.weeks.flat().map((d, i) => {
          if (!d) return <span key={`pad-${i}`} />;
          const level = activity.get(d) ?? 0;
          const future = d > today;
          const day = Number(d.slice(8));
          const label = `${view.month}월 ${day}일: ${level > 0 ? `${level}/${CHECKIN_ITEMS}개 체크` : "체크 없음"}`;
          return (
            <span
              key={d}
              role="gridcell"
              title={label}
              aria-label={label}
              className="aspect-square rounded-md flex items-center justify-center text-[11px]"
              style={{
                ...cellStyle(future ? 0 : level),
                opacity: future ? 0.4 : 1,
                outline: d === today ? "2px solid var(--gold)" : undefined,
                outlineOffset: d === today ? 1 : undefined,
              }}
            >
              {day}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-muted">
        <span className="mr-0.5">적음</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="w-3 h-3 rounded-sm" style={cellStyle(l)} />
        ))}
        <span className="ml-0.5">많음</span>
      </div>
    </div>
  );
}
