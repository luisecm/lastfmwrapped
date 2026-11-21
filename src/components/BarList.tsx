export type BarListItem = {
  label: string;
  sublabel?: string;
  count: number;
};

// Single-series ranked horizontal bars. No legend box (one color = the
// chart's own title already says what's plotted).
export function BarList({ title, items }: { title: string; items: BarListItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--viz-text-secondary)]">{title}</h3>
      <ol className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-[var(--viz-text-muted)]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-[var(--viz-text-primary)]">{item.label}</div>
              {item.sublabel && (
                <div className="truncate text-xs text-[var(--viz-text-muted)]">{item.sublabel}</div>
              )}
              <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--viz-grid)]">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.max(4, (item.count / max) * 100)}%`,
                    backgroundColor: "var(--viz-series-1)",
                  }}
                />
              </div>
            </div>
            <span className="w-10 shrink-0 text-right text-sm tabular-nums text-[var(--viz-text-secondary)]">
              {item.count}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
