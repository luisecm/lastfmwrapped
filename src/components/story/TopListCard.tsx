import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

export const TopListCard = forwardRef<
  HTMLDivElement,
  { title: string; items: { label: string; count: number }[]; year: number }
>(function TopListCard({ title, items, year }, ref) {
  return (
    <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
      <div className="text-sm uppercase tracking-widest text-white/80">{title}</div>
      <ol className="mt-2 flex w-full flex-col gap-2 text-left">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="w-4 text-right text-sm font-bold text-white/60">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-lg font-semibold">{item.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-white/70">{item.count}</span>
          </li>
        ))}
      </ol>
    </StoryCardShell>
  );
});
