import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

export const MinutesCard = forwardRef<HTMLDivElement, { estimatedMinutes: number; year: number }>(
  function MinutesCard({ estimatedMinutes, year }, ref) {
    const hours = Math.round(estimatedMinutes / 60);

    return (
      <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
        <div className="text-sm uppercase tracking-widest text-white/80">You listened for</div>
        <div className="text-6xl font-bold tabular-nums">{hours.toLocaleString()}</div>
        <div className="text-sm uppercase tracking-widest text-white/80">hours</div>
        <div className="mt-2 text-sm text-white/80">({estimatedMinutes.toLocaleString()} minutes)</div>
        <div className="mt-3 text-[10px] text-white/60">Estimated from your most-played tracks</div>
      </StoryCardShell>
    );
  }
);
