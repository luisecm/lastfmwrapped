import { toPng } from "html-to-image";

// Story cards are authored at 270x480 (a clean 9:16 preview size) and
// rasterized at 4x so the exported PNG lands exactly on Instagram Story's
// native 1080x1920 canvas.
export const STORY_EXPORT_PIXEL_RATIO = 4;

export async function exportNodeAsPng(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, { pixelRatio: STORY_EXPORT_PIXEL_RATIO });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function shareOrExportPng(node: HTMLElement, filename: string, shareTitle: string) {
  const dataUrl = await toPng(node, { pixelRatio: STORY_EXPORT_PIXEL_RATIO });

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareTitle });
        return;
      } catch {
        // User cancelled or share failed — fall back to a direct download.
      }
    }
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
