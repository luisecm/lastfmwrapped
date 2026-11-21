type Entry = { artist: string; yearCount: number; allTimeCount: number };

function EntryRow({ entry, emphasis }: { entry: Entry; emphasis: "year" | "allTime" }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--viz-text-primary)]">{entry.artist}</span>
      <span className="shrink-0 text-xs tabular-nums text-[var(--viz-text-muted)]">
        {emphasis === "year" ? `${entry.yearCount} plays, all new` : `${entry.yearCount} of ${entry.allTimeCount} plays`}
      </span>
    </li>
  );
}

export function DiscoveryList({ discoveries, classics }: { discoveries: Entry[]; classics: Entry[] }) {
  if (discoveries.length === 0 && classics.length === 0) return null;

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {discoveries.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--viz-text-secondary)]">New discoveries this year</h3>
          <ol className="flex flex-col gap-2">
            {discoveries.map((d) => (
              <EntryRow key={d.artist} entry={d} emphasis="year" />
            ))}
          </ol>
        </div>
      )}
      {classics.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--viz-text-secondary)]">Old classics you returned to</h3>
          <ol className="flex flex-col gap-2">
            {classics.map((c) => (
              <EntryRow key={c.artist} entry={c} emphasis="allTime" />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
