import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

export const TopEntityCard = forwardRef<
  HTMLDivElement,
  {
    kind: "artist" | "track" | "album";
    name: string;
    sublabel?: string;
    count: number;
    year: number;
    imageUrl?: string | null;
  }
>(function TopEntityCard({ kind, name, sublabel, count, year, imageUrl }, ref) {
  const label = kind === "artist" ? "Top artist" : kind === "track" ? "Top track" : "Top album";

  return (
    <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
      <div className="text-sm uppercase tracking-widest text-white/80">Your #1 {kind}</div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-28 w-28 rounded-lg object-cover shadow-lg" crossOrigin="anonymous" />
      )}
      <div className="px-2 text-3xl font-bold leading-tight">{name}</div>
      {sublabel && <div className="text-base text-white/80">{sublabel}</div>}
      <div className="mt-4 text-5xl font-bold tabular-nums">{count.toLocaleString()}</div>
      <div className="text-sm uppercase tracking-widest text-white/80">plays</div>
      <div className="mt-1 text-[10px] text-white/60">{label}</div>
    </StoryCardShell>
  );
});
