import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

type Entry = { artist: string; yearCount: number; allTimeCount: number };

export const DiscoveryCard = forwardRef<
  HTMLDivElement,
  { discovery?: Entry; classic?: Entry; year: number }
>(function DiscoveryCard({ discovery, classic, year }, ref) {
  return (
    <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
      {discovery && (
        <div className="flex flex-col gap-1">
          <div className="text-sm uppercase tracking-widest text-white/80">New discovery</div>
          <div className="px-2 text-2xl font-bold leading-tight">{discovery.artist}</div>
          <div className="text-xs text-white/70">{discovery.yearCount.toLocaleString()} plays, all this year</div>
        </div>
      )}
      {discovery && classic && <div className="my-2 h-px w-24 bg-white/30" />}
      {classic && (
        <div className="flex flex-col gap-1">
          <div className="text-sm uppercase tracking-widest text-white/80">Old classic, revisited</div>
          <div className="px-2 text-2xl font-bold leading-tight">{classic.artist}</div>
          <div className="text-xs text-white/70">
            {classic.yearCount.toLocaleString()} of {classic.allTimeCount.toLocaleString()} all-time plays this year
          </div>
        </div>
      )}
    </StoryCardShell>
  );
});
