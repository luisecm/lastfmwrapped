import { forwardRef, type ReactNode } from "react";

export const STORY_WIDTH = 270;
export const STORY_HEIGHT = 480;

// Fixed 9:16 canvas, rasterized 4x on export to land on Instagram Story's
// native 1080x1920. Keep all content inside; nothing here should rely on
// ancestor styling, since html-to-image clones this node in isolation.
export const StoryCardShell = forwardRef<HTMLDivElement, { children: ReactNode; footer: string }>(
  function StoryCardShell({ children, footer }, ref) {
    return (
      <div
        ref={ref}
        style={{ width: STORY_WIDTH, height: STORY_HEIGHT }}
        className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0d366b] via-[#1c5cab] to-[#2a78d6] p-6 text-white"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">{children}</div>
        <div className="text-center text-[10px] uppercase tracking-widest text-white/70">{footer}</div>
      </div>
    );
  }
);
