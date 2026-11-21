import { forwardRef } from "react";
import { DAY_NAMES } from "@/lib/aggregate";
import { StoryCardShell } from "./StoryCardShell";

const DAY_LABELS = DAY_NAMES.map((d) => d[0]);

export const DayOfWeekCard = forwardRef<HTMLDivElement, { dayOfWeek: number[]; year: number }>(
  function DayOfWeekCard({ dayOfWeek, year }, ref) {
    const max = Math.max(1, ...dayOfWeek);
    const peakIndex = dayOfWeek.indexOf(max);

    return (
      <StoryCardShell ref={ref} footer={`lastfmwrapped · ${year}`}>
        <div className="text-sm uppercase tracking-widest text-white/80">You listen most on</div>
        <div className="text-4xl font-bold leading-tight">{DAY_NAMES[peakIndex]}s</div>
        <div className="mt-6 flex h-20 w-full gap-1.5 px-2">
          {dayOfWeek.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full max-w-5 rounded-t"
                style={{
                  height: `${Math.max(4, (count / max) * 100)}%`,
                  backgroundColor: i === peakIndex ? "#ffffff" : "rgba(255,255,255,0.45)",
                }}
              />
              <span className="text-[10px] text-white/70">{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-white/60">UTC</div>
      </StoryCardShell>
    );
  }
);
