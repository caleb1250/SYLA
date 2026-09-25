export default function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="h-1.5 flex-1 rounded-full bg-background overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${total}개 중 ${done}개 완료`}
    >
      <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}
