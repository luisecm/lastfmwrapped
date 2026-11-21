export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--viz-grid)] bg-[var(--viz-surface)] px-4 py-3">
      <div className="text-sm text-[var(--viz-text-secondary)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-[var(--viz-text-primary)]">{value}</div>
    </div>
  );
}
