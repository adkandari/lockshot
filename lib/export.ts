import JSZip from "jszip";
import { SlideData, Locale, TemplateId } from "./types";
import { loadImage as loadImageFromIDB } from "./imageStorage";
import { extractDominantColor } from "./colorExtract";

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

    // Extract colors for Kova if needed
    let kovaColors = null;
    if (slide.templateId === 'full_bleed_caption_bottom' && screenshotImg) {
      kovaColors = await extractDominantColor(screenshotImg);
    }

    await renderTemplate(ctx, slide.templateId, screenshotImg, overlay, hasOverlay, kovaColors);

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
  hasOverlay: boolean,
  kovaColors?: { light: string; dark: string; text: string } | null
) {
  const width = EXPORT_WIDTH;
  const height = EXPORT_HEIGHT;

  switch (templateId) {
    case "caption_top": // Pluto: Clean SaaS blue/white
      if (hasOverlay && overlay) {
        const captionHeight = 380;
        
        // Bright blue gradient for clean SaaS look
        const gradient = ctx.createLinearGradient(0, 0, width, captionHeight);
        gradient.addColorStop(0, "#0ea5e9"); // sky-500
        gradient.addColorStop(0.5, "#3b82f6"); // blue-500
        gradient.addColorStop(1, "#06b6d4"); // cyan-500
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, captionHeight);

        const padding = 100;
        let currentY = padding + 20;

        if (overlay.headline) {
          ctx.font = `900 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, padding, currentY, width - padding * 2, 140);
          currentY += 160;
        }

        if (overlay.subhead) {
          ctx.font = `64px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, padding, currentY, width - padding * 2, 80);
        }
      }

      if (img) {
        const imgY = hasOverlay ? 420 : 0;
        const imgHeight = hasOverlay ? height - 480 : height;
        const imgX = hasOverlay ? 60 : 0;
        const imgWidth = hasOverlay ? width - 120 : width;
        
        if (hasOverlay) {
          // White background behind rounded image
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, imgY - 40, width, height - imgY + 40);
          
          // Draw rounded image with shadow
          ctx.save();
          const radius = 48;
          ctx.beginPath();
          roundRect(ctx, imgX, imgY, imgWidth, imgHeight, radius);
          ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
          ctx.shadowBlur = 60;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 20;
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
          ctx.restore();
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }
      }
      break;

    case "framed_on_gradient": // Astra: Dark navy + lavender
      // Deep navy gradient
      const gradientBg = ctx.createLinearGradient(0, 0, width, height);
      gradientBg.addColorStop(0, "#0f172a"); // slate-900
      gradientBg.addColorStop(0.5, "#172554"); // blue-950
      gradientBg.addColorStop(1, "#312e81"); // indigo-950
      ctx.fillStyle = gradientBg;
      ctx.fillRect(0, 0, width, height);

      let frameY = 780;
      
      if (hasOverlay && overlay) {
        let textY = 260;

        if (overlay.headline) {
          ctx.font = `900 140px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, width / 2, textY, width * 0.85, 160);
          textY += 200;
        }

        if (overlay.subhead) {
          ctx.font = `76px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = "#e9d5ff"; // purple-200
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, width / 2, textY, width * 0.85, 92);
        }
      }

      if (img) {
        const frameWidth = width * 0.65;
        const frameHeight = frameWidth * (19.5 / 9);
        const frameX = (width - frameWidth) / 2;
        const frameRadius = 112;

        // Main frame with lavender ring accent
        ctx.save();
        
        // Lavender accent ring
        ctx.strokeStyle = "rgba(196, 181, 253, 0.3)"; // purple-300 with opacity
        ctx.lineWidth = 6;
        ctx.beginPath();
        roundRect(ctx, frameX - 3, frameY - 3, frameWidth + 6, frameHeight + 6, frameRadius + 3);
        ctx.stroke();
        
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius);
        ctx.clip();
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.drawImage(img, frameX, frameY, frameWidth, frameHeight);
        ctx.restore();
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

    case "full_bleed_caption_bottom": // Kova: Organic background + centered phone
    default:
      const colors = kovaColors || { light: 'rgb(243, 232, 255)', dark: 'rgb(196, 181, 253)', text: 'rgb(109, 40, 217)' };
      
      // 1. Fill with light background
      ctx.fillStyle = colors.light;
      ctx.fillRect(0, 0, width, height);
      
      // 2. Draw organic blob shapes
      ctx.fillStyle = colors.dark;
      ctx.globalAlpha = 0.6;
      
      // Top-right blob
      const blob1X = width * 0.85;
      const blob1Y = height * 0.1;
      const blob1R = width * 0.35;
      const gradient1 = ctx.createRadialGradient(blob1X, blob1Y, 0, blob1X, blob1Y, blob1R);
      gradient1.addColorStop(0, colors.dark);
      gradient1.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient1;
      ctx.beginPath();
      ctx.arc(blob1X, blob1Y, blob1R, 0, Math.PI * 2);
      ctx.fill();
      
      // Bottom-left blob
      ctx.globalAlpha = 0.5;
      const blob2X = width * 0.15;
      const blob2Y = height * 0.9;
      const blob2R = width * 0.3;
      const gradient2 = ctx.createRadialGradient(blob2X, blob2Y, 0, blob2X, blob2Y, blob2R);
      gradient2.addColorStop(0, colors.dark);
      gradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient2;
      ctx.beginPath();
      ctx.arc(blob2X, blob2Y, blob2R, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      
      // 3. Draw headline at top
      if (hasOverlay && overlay) {
        const textPadding = 100;
        let textY = 120;
        
        if (overlay.headline) {
          ctx.font = `900 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = colors.text;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, textPadding, textY, width - textPadding * 2, 140);
          textY += 160;
        }
        
        if (overlay.subhead) {
          ctx.font = `64px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = colors.text;
          ctx.globalAlpha = 0.8;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, textPadding, textY, width - textPadding * 2, 80);
          ctx.globalAlpha = 1.0;
        }
      }
      
      // 4. Draw phone frame with screenshot
      if (img) {
        const frameWidth = width * 0.58;
        const frameHeight = frameWidth * (19.5 / 9);
        const frameX = (width - frameWidth) / 2;
        const frameY = hasOverlay ? 580 : (height - frameHeight) / 2;
        const frameRadius = 96;
        
        // Shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 80;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 40;
        
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius);
        ctx.clip();
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.drawImage(img, frameX, frameY, frameWidth, frameHeight);
        ctx.restore();
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
