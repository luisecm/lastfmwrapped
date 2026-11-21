const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Single-series column chart, one bar per month up to the current month.
export function MonthlyChart({ monthly }: { monthly: number[] }) {
  const visible = monthly.slice(0, new Date().getUTCMonth() + 1);
  const max = Math.max(1, ...visible);
  const maxIndex = visible.indexOf(max);

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--viz-text-secondary)]">Scrobbles by month</h3>
      <div className="flex h-32 gap-1">
        {visible.map((count, i) => (
          // No `items-end` on the row: flex children need stretch (the
          // default) so each column has a definite height for the bar's
          // percentage height to resolve against — `justify-end` below
          // already bottom-aligns the bar + label within that height.
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
        {visible.map((_, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-[var(--viz-text-muted)]">
            {MONTH_LABELS[i]}
          </div>
        ))}
      </div>
    </div>
  );
}
