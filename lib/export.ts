import JSZip from "jszip";
import { SlideData, Locale, TemplateId } from "./types";
import { loadImage as loadImageFromIDB } from "./imageStorage";
import { extractDominantColor } from "./colorExtract";

const EXPORT_WIDTH = 1320;
const EXPORT_HEIGHT = 2868;

export async function exportZip(slides: SlideData[], locale: Locale, projectName: string = 'lockshot') {
  const zip = new JSZip();
  const safeProjectName = projectName.toLowerCase().replace(/\s+/g, '-');

  // Filter out empty campaign slides
  const slidesToExport = slides.filter(slide => {
    if (slide.kind === "campaign" && !slide.imageKey && !slide.backgroundImage) {
      return false;
    }
    return true;
  });

  for (const slide of slidesToExport) {
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

    // Extract colors for Perfect template only
    // Growth uses fixed Dysperse palette
    let extractedColors = null;
    if (slide.templateId === 'full_bleed_caption_bottom' && screenshotImg) {
      // Use slide override colors or extract from image
      if (slide.colors && (slide.colors.text || slide.colors.background || slide.colors.accent)) {
        extractedColors = {
          text: slide.colors.text || '#6d28d9',
          light: slide.colors.background || '#f3e8ff',
          dark: slide.colors.accent || '#c4b5fd',
        };
      } else {
        extractedColors = await extractDominantColor(screenshotImg);
      }
    }

    // Wait for fonts to be ready before rendering
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    await renderTemplate(ctx, slide.templateId, screenshotImg, overlay, hasOverlay, extractedColors, slide.kind, slide.colors);

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
  extractedColors?: { light: string; dark: string; text: string } | null,
  slideKind?: "campaign" | "product",
  slideColors?: { text?: string; background?: string; accent?: string }
) {
  const width = EXPORT_WIDTH;
  const height = EXPORT_HEIGHT;

  // Special case: Campaign slide for Growth template
  if (slideKind === "campaign") {
    // Fixed Dysperse palette for campaign slides
    const colors = { light: 'rgb(245, 242, 237)', dark: 'rgb(138, 154, 123)', text: 'rgb(74, 55, 40)' };
    
    // 1. Fill with cream background
    ctx.fillStyle = colors.light;
    ctx.fillRect(0, 0, width, height);
    
    // 2. Draw organic blobs
    ctx.globalAlpha = 0.35;
    const blobTopRight = ctx.createRadialGradient(width * 0.85, height * 0.15, 0, width * 0.85, height * 0.15, width * 0.3);
    blobTopRight.addColorStop(0, colors.dark);
    blobTopRight.addColorStop(1, 'transparent');
    ctx.fillStyle = blobTopRight;
    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.15, width * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 0.3;
    const blobBottomLeft = ctx.createRadialGradient(width * 0.15, height * 0.85, 0, width * 0.15, height * 0.85, width * 0.27);
    blobBottomLeft.addColorStop(0, colors.dark);
    blobBottomLeft.addColorStop(1, 'transparent');
    ctx.fillStyle = blobBottomLeft;
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.85, width * 0.27, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1.0;
    
    // 3. Draw stacked headline with last word in accent
    if (hasOverlay && overlay && overlay.headline) {
      const words = overlay.headline.split(/\s+/);
      const lastWord = words[words.length - 1];
      const otherWords = words.slice(0, -1).join(' ');
      
      const textX = 100;
      let textY = 120;
      
      ctx.font = `900 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      if (otherWords) {
        ctx.fillStyle = colors.text;
        wrapText(ctx, otherWords.toLowerCase(), textX, textY, width - 200, 150);
        textY += 150;
      }
      
      // Last word in accent with squiggle
      ctx.fillStyle = colors.dark;
      ctx.fillText(lastWord.toLowerCase(), textX, textY);
      
      // Draw squiggle underline
      const textWidth = ctx.measureText(lastWord.toLowerCase()).width;
      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = 8;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(textX, textY + 145);
      ctx.bezierCurveTo(
        textX + textWidth * 0.25, textY + 135,
        textX + textWidth * 0.5, textY + 155,
        textX + textWidth * 0.75, textY + 145
      );
      ctx.bezierCurveTo(
        textX + textWidth * 0.875, textY + 140,
        textX + textWidth, textY + 145,
        textX + textWidth, textY + 145
      );
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      
      textY += 180;
      
      // Subhead
      if (overlay.subhead) {
        ctx.font = `56px Georgia, "Source Serif 4", serif`;
        ctx.fillStyle = colors.text;
        ctx.globalAlpha = 0.75;
        wrapText(ctx, overlay.subhead, textX, textY, width - 200, 70);
        ctx.globalAlpha = 1.0;
      }
    }
    
    // 4. Draw lifestyle photo in rounded rect on right/bottom
    if (img) {
      const photoWidth = width * 0.5;
      const photoHeight = height * 0.67;
      const photoX = width - photoWidth - 80;
      const photoY = height - photoHeight - 100;
      const photoRadius = 96;
      
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 30;
      
      ctx.beginPath();
      roundRect(ctx, photoX, photoY, photoWidth, photoHeight, photoRadius);
      ctx.clip();
      ctx.drawImage(img, photoX, photoY, photoWidth, photoHeight);
      ctx.restore();
    }
    
    return;
  }

  switch (templateId) {
    case "caption_top": // Growth: Cream campaign energy with top type
      // Fixed Dysperse palette (user overrides take precedence)
      const growthDefaultColors = { light: 'rgb(245, 242, 237)', dark: 'rgb(138, 154, 123)', text: 'rgb(74, 55, 40)' };
      const growthColors = {
        light: slideColors?.background || growthDefaultColors.light,
        dark: slideColors?.accent || growthDefaultColors.dark,
        text: slideColors?.text || growthDefaultColors.text,
      };
      
      // 1. Fill with warm cream background
      ctx.fillStyle = growthColors.light;
      ctx.fillRect(0, 0, width, height);
      
      // 2. Draw soft organic blobs in corners
      ctx.fillStyle = growthColors.dark;
      ctx.globalAlpha = 0.4;
      
      // Top-left blob
      const blob1X = width * 0.15;
      const blob1Y = height * 0.1;
      const blob1R = width * 0.25;
      const gradient1 = ctx.createRadialGradient(blob1X, blob1Y, 0, blob1X, blob1Y, blob1R);
      gradient1.addColorStop(0, growthColors.dark);
      gradient1.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient1;
      ctx.beginPath();
      ctx.arc(blob1X, blob1Y, blob1R, 0, Math.PI * 2);
      ctx.fill();
      
      // Bottom-right blob
      ctx.globalAlpha = 0.3;
      const blob2X = width * 0.85;
      const blob2Y = height * 0.9;
      const blob2R = width * 0.22;
      const gradient2 = ctx.createRadialGradient(blob2X, blob2Y, 0, blob2X, blob2Y, blob2R);
      gradient2.addColorStop(0, growthColors.dark);
      gradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient2;
      ctx.beginPath();
      ctx.arc(blob2X, blob2Y, blob2R, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      
      // 3. Draw type at the TOP
      if (hasOverlay && overlay) {
        const textPadding = 80;
        let textY = 100;
        
        if (overlay.headline) {
          ctx.font = `900 110px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = growthColors.dark;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline.toUpperCase(), textPadding, textY, width - textPadding * 2, 130);
          textY += 150;
        }
        
        if (overlay.subhead) {
          // Try to load serif font for subhead
          ctx.font = `58px Georgia, "Source Serif 4", serif`;
          ctx.fillStyle = growthColors.text;
          ctx.globalAlpha = 0.85;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, textPadding, textY, width - textPadding * 2, 72);
          ctx.globalAlpha = 1.0;
        }
      }
      
      // 4. Draw phone with screenshot - thin bezel, image determines height
      if (img) {
        const maxFrameWidth = width * 0.70;
        const imgAspect = img.width / img.height;
        
        // Calculate frame dimensions based on image aspect ratio
        let frameWidth = maxFrameWidth;
        let frameHeight = frameWidth / imgAspect;
        
        // Position frame
        const frameX = (width - frameWidth) / 2;
        const frameY = hasOverlay ? 500 : (height - frameHeight) / 2;
        const frameRadius = 64;
        const bezelWidth = 8;
        
        // Outer bezel
        ctx.save();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        roundRect(ctx, frameX - bezelWidth, frameY - bezelWidth, frameWidth + bezelWidth * 2, frameHeight + bezelWidth * 2, frameRadius);
        ctx.fill();
        
        // Inner screen with shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
        
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius - bezelWidth / 2);
        ctx.clip();
        
        // Draw image to fill frame exactly
        ctx.drawImage(img, frameX, frameY, frameWidth, frameHeight);
        ctx.restore();
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

    case "full_bleed_caption_bottom": // Perfect: Organic background + centered phone
    default:
      const colors = extractedColors || { light: 'rgb(243, 232, 255)', dark: 'rgb(196, 181, 253)', text: 'rgb(109, 40, 217)' };
      
      // 1. Fill with light background
      ctx.fillStyle = colors.light;
      ctx.fillRect(0, 0, width, height);
      
      // 2. Draw organic blob shapes
      ctx.fillStyle = colors.dark;
      ctx.globalAlpha = 0.6;
      
      // Top-right blob (Perfect template)
      const perfectBlob1X = width * 0.85;
      const perfectBlob1Y = height * 0.1;
      const perfectBlob1R = width * 0.35;
      const perfectGradient1 = ctx.createRadialGradient(perfectBlob1X, perfectBlob1Y, 0, perfectBlob1X, perfectBlob1Y, perfectBlob1R);
      perfectGradient1.addColorStop(0, colors.dark);
      perfectGradient1.addColorStop(1, 'transparent');
      ctx.fillStyle = perfectGradient1;
      ctx.beginPath();
      ctx.arc(perfectBlob1X, perfectBlob1Y, perfectBlob1R, 0, Math.PI * 2);
      ctx.fill();
      
      // Bottom-left blob (Perfect template)
      ctx.globalAlpha = 0.5;
      const perfectBlob2X = width * 0.15;
      const perfectBlob2Y = height * 0.9;
      const perfectBlob2R = width * 0.3;
      const perfectGradient2 = ctx.createRadialGradient(perfectBlob2X, perfectBlob2Y, 0, perfectBlob2X, perfectBlob2Y, perfectBlob2R);
      perfectGradient2.addColorStop(0, colors.dark);
      perfectGradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = perfectGradient2;
      ctx.beginPath();
      ctx.arc(perfectBlob2X, perfectBlob2Y, perfectBlob2R, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      
      // 3. Draw headline at top - tighter spacing
      if (hasOverlay && overlay) {
        const textPadding = 100;
        let textY = 60;
        
        if (overlay.headline) {
          ctx.font = `900 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = colors.text;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.headline, textPadding, textY, width - textPadding * 2, 140);
          textY += 140;
        }
        
        if (overlay.subhead) {
          ctx.font = `56px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
          ctx.fillStyle = colors.text;
          ctx.globalAlpha = 0.8;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          wrapText(ctx, overlay.subhead, textPadding, textY, width - textPadding * 2, 70);
          ctx.globalAlpha = 1.0;
        }
      }
      
      // 4. Draw phone with screenshot - thin bezel, image determines height
      if (img) {
        const maxFrameWidth = width * 0.74;
        const imgAspect = img.width / img.height;
        
        // Calculate frame dimensions based on image aspect ratio
        let frameWidth = maxFrameWidth;
        let frameHeight = frameWidth / imgAspect;
        
        // Position frame
        const frameX = (width - frameWidth) / 2;
        const frameY = hasOverlay ? 350 : (height - frameHeight) / 2;
        const frameRadius = 80;
        const bezelWidth = 4;
        
        // Outer bezel (thin realistic iPhone bezel)
        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 80;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 40;
        ctx.beginPath();
        roundRect(ctx, frameX - bezelWidth, frameY - bezelWidth, frameWidth + bezelWidth * 2, frameHeight + bezelWidth * 2, frameRadius);
        ctx.fill();
        
        // Inner screen area
        ctx.shadowColor = "transparent";
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius - bezelWidth);
        ctx.clip();
        
        // Draw image to fill frame exactly
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
