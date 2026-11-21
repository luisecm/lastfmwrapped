import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

export const CoverCard = forwardRef<
  HTMLDivElement,
  { displayName: string; year: number; totalScrobbles: number; uniqueArtists: number }
>(function CoverCard({ displayName, year, totalScrobbles, uniqueArtists }, ref) {
  return (
    <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
      <div className="text-sm uppercase tracking-widest text-white/80">{displayName}&apos;s</div>
      <div className="text-4xl font-bold leading-tight">{year} Wrapped</div>
      <div className="mt-4 text-6xl font-bold tabular-nums">{totalScrobbles.toLocaleString()}</div>
      <div className="text-sm uppercase tracking-widest text-white/80">scrobbles so far</div>
      <div className="mt-2 text-xs text-white/70">across {uniqueArtists.toLocaleString()} artists</div>
    </StoryCardShell>
  );
});
