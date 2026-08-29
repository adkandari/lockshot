import JSZip from "jszip";
import { SlideData, Locale } from "./types";

const EXPORT_WIDTH = 1320;
const EXPORT_HEIGHT = 2868;

export async function exportZip(slides: SlideData[], locale: Locale, projectName: string = 'lockshot') {
  const zip = new JSZip();
  const safeProjectName = projectName.toLowerCase().replace(/\s+/g, '-');

  for (const slide of slides) {
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_WIDTH;
    canvas.height = EXPORT_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

    if (slide.backgroundImage) {
      const img = await loadImage(slide.backgroundImage);
      ctx.drawImage(img, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    }

    const overlay = slide.overlays[locale];
    
    if (!overlay) {
      console.warn(`No overlay for locale ${locale} on slide ${slide.id}, skipping overlay`);
    } else if (overlay.headline || overlay.subhead) {
      const overlayHeight = 300;
      const overlayY = EXPORT_HEIGHT - overlayHeight;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, overlayY, EXPORT_WIDTH, overlayHeight);

      const padding = 60;
      let currentY = overlayY + padding + 40;

      if (overlay.headline) {
        const headlineFontSize = 80;
        ctx.font = `bold ${headlineFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        wrapText(ctx, overlay.headline, padding, currentY, EXPORT_WIDTH - padding * 2, headlineFontSize * 1.2);
        currentY += headlineFontSize * 1.2 + 20;
      }

      if (overlay.subhead) {
        const subheadFontSize = 56;
        ctx.font = `${subheadFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = "#e5e7eb";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        wrapText(ctx, overlay.subhead, padding, currentY, EXPORT_WIDTH - padding * 2, subheadFontSize * 1.2);
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/png",
        1.0
      );
    });

    zip.file(`${safeProjectName}-slide-${slide.id}-${locale}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeProjectName}-${locale}-screenshots.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  if (!text) return;
  
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
