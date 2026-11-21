import { forwardRef } from "react";
import { StoryCardShell } from "./StoryCardShell";

export const GenreCard = forwardRef<
  HTMLDivElement,
  { topGenre: string; breakdown: { name: string; score: number }[]; year: number }
>(function GenreCard({ topGenre, breakdown, year }, ref) {
  const rest = breakdown.filter((g) => g.name !== topGenre).slice(0, 4);

  return (
    <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
      <div className="text-sm uppercase tracking-widest text-white/80">Your top genre</div>
      <div className="px-2 text-4xl font-bold capitalize leading-tight">{topGenre}</div>
      {rest.length > 0 && (
        <div className="mt-4 flex flex-col gap-1 text-sm text-white/80">
          {rest.map((g) => (
            <div key={g.name} className="capitalize">
              {g.name}
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 text-[10px] text-white/60">Based on your top artists&apos; genre tags</div>
    </StoryCardShell>
  );
});
