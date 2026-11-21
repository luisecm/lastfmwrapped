const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Day-of-week x hour-of-day scrobble counts, both UTC (we don't know the
// listener's real timezone from Last.fm timestamps alone).
export function ListeningHeatmap({ dayHourHeatmap }: { dayHourHeatmap: number[][] }) {
  const max = Math.max(1, ...dayHourHeatmap.flat());

  function bucketColor(count: number): string {
    if (count <= 0) return "var(--viz-grid)";
    const ratio = count / max;
    if (ratio < 0.15) return "var(--heat-1)";
    if (ratio < 0.4) return "var(--heat-2)";
    if (ratio < 0.7) return "var(--heat-3)";
    return "var(--heat-4)";
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--viz-text-secondary)]">When you listen (UTC)</h3>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5">
          {dayHourHeatmap.map((row, d) => (
            <div key={d} className="flex items-center gap-0.5">
              <span className="w-8 shrink-0 text-right text-[10px] text-[var(--viz-text-muted)]">
                {DAY_LABELS[d]}
              </span>
              {row.map((count, h) => (
                <div
                  key={h}
                  title={`${DAY_LABELS[d]} ${h}:00 UTC — ${count} scrobbles`}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ backgroundColor: bucketColor(count) }}
                />
              ))}
            </div>
          ))}
          <div className="flex gap-0.5 pl-8 pt-0.5">
            {dayHourHeatmap[0].map((_, h) => (
              <span key={h} className="w-3 shrink-0 text-center text-[8px] text-[var(--viz-text-muted)]">
                {h % 6 === 0 ? h : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
