import { DAY_NAMES } from "@/lib/aggregate";

const DAY_LABELS = DAY_NAMES.map((d) => d.slice(0, 3));

// Single-series column chart, one bar per day of week (UTC).
export function DayOfWeekChart({ dayOfWeek }: { dayOfWeek: number[] }) {
  const max = Math.max(1, ...dayOfWeek);
  const maxIndex = dayOfWeek.indexOf(max);

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--viz-text-secondary)]">Scrobbles by day of week (UTC)</h3>
      <div className="flex h-32 gap-1">
        {dayOfWeek.map((count, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            {i === maxIndex && (
              <span className="text-xs tabular-nums text-[var(--viz-text-secondary)]">{count}</span>
            )}
            <div
              className="w-full max-w-6 rounded-t"
              style={{
                height: `${Math.max(2, (count / max) * 100)}%`,
                backgroundColor: "var(--viz-series-1)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 border-t border-[var(--viz-baseline)] pt-1">
        {dayOfWeek.map((_, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-[var(--viz-text-muted)]">
            {DAY_LABELS[i]}
          </div>
        ))}
      </div>
    </div>
  );
}
