import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

export const HabitsCard = forwardRef<
  HTMLDivElement,
  { label: string; detail: string; year: number }
>(function HabitsCard({ label, detail, year }, ref) {
  return (
    <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
      <div className="text-sm uppercase tracking-widest text-white/80">Your listening style</div>
      <div className="text-4xl font-bold leading-tight">{label}</div>
      <div className="mt-3 text-sm text-white/80">{detail}</div>
    </StoryCardShell>
  );
});
