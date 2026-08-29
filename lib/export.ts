import JSZip from "jszip";
import { SlideData, Locale, TemplateId } from "./types";
import { loadImage as loadImageFromIDB } from "./imageStorage";

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

    let screenshotImg: HTMLImageElement | null = null;
    if (slide.imageKey) {
      const blob = await loadImageFromIDB(slide.imageKey);
      if (blob) {
        screenshotImg = await loadImageElement(URL.createObjectURL(blob));
      }
    } else if (slide.backgroundImage) {
      screenshotImg = await loadImageElement(slide.backgroundImage);
    }

    const overlay = slide.overlays[locale];
    const hasOverlay = !!(overlay && (overlay.headline || overlay.subhead));

    await renderTemplate(ctx, slide.templateId, screenshotImg, overlay, hasOverlay);

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

async function renderTemplate(
  ctx: CanvasRenderingContext2D,
  templateId: TemplateId,
  img: HTMLImageElement | null,
  overlay: { headline: string; subhead: string } | undefined,
  hasOverlay: boolean
) {
  const width = EXPORT_WIDTH;
  const height = EXPORT_HEIGHT;

  switch (templateId) {
    case "caption_top":
      if (hasOverlay && overlay) {
        const captionHeight = 240;
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, width, captionHeight);

        const padding = 60;
        let currentY = padding;

        if (overlay.headline) {
          ctx.font = `bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, padding, currentY, width - padding * 2, 96);
          currentY += 96 + 20;
        }

        if (overlay.subhead) {
          ctx.font = `56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "#e5e7eb";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, padding, currentY, width - padding * 2, 67);
        }
      }

      if (img) {
        const imgY = hasOverlay ? 240 : 0;
        const imgHeight = hasOverlay ? height - 240 : height;
        ctx.drawImage(img, 0, imgY, width, imgHeight);
      }
      break;

    case "framed_on_gradient":
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#9333ea");
      gradient.addColorStop(1, "#db2777");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      let frameY = 600;
      
      if (hasOverlay && overlay) {
        let textY = 300;

        if (overlay.headline) {
          ctx.font = `bold 96px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, width / 2, textY, width * 0.8, 115);
          textY += 135;
        }

        if (overlay.subhead) {
          ctx.font = `72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, width / 2, textY, width * 0.8, 86);
        }
      }

      if (img) {
        const frameWidth = width * 0.7;
        const frameHeight = frameWidth * (19.5 / 9);
        const frameX = (width - frameWidth) / 2;
        const frameRadius = 60;

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius);
        ctx.clip();
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.drawImage(img, frameX, frameY, frameWidth, frameHeight);
        ctx.restore();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius);
        ctx.stroke();
      }
      break;

    case "gradient_only":
      const gradientOnly = ctx.createLinearGradient(0, 0, width, height);
      gradientOnly.addColorStop(0, "#3b82f6");
      gradientOnly.addColorStop(1, "#9333ea");
      ctx.fillStyle = gradientOnly;
      ctx.fillRect(0, 0, width, height);

      if (hasOverlay && overlay) {
        let centerY = height / 2 - 100;

        if (overlay.headline) {
          ctx.font = `bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          wrapText(ctx, overlay.headline, width / 2, centerY, width * 0.85, 144);
          centerY += 180;
        }

        if (overlay.subhead) {
          ctx.font = `80px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          wrapText(ctx, overlay.subhead, width / 2, centerY, width * 0.85, 96);
        }
      }
      break;

    case "full_bleed_caption_bottom":
    default:
      if (img) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        const fallbackGradient = ctx.createLinearGradient(0, 0, width, height);
        fallbackGradient.addColorStop(0, "#d1d5db");
        fallbackGradient.addColorStop(1, "#9ca3af");
        ctx.fillStyle = fallbackGradient;
        ctx.fillRect(0, 0, width, height);
      }

      if (hasOverlay && overlay) {
        const overlayHeight = 300;
        const overlayY = height - overlayHeight;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, overlayY, width, overlayHeight);

        const padding = 60;
        let currentY = overlayY + padding + 40;

        if (overlay.headline) {
          ctx.font = `bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, padding, currentY, width - padding * 2, 96);
          currentY += 96 + 20;
        }

        if (overlay.subhead) {
          ctx.font = `56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "#e5e7eb";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, padding, currentY, width - padding * 2, 67);
        }
      }
      break;
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
}
