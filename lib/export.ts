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

    const gradient = ctx.createLinearGradient(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    if (slide.templateId === "gradient") {
      const gradients = [
        ["#667eea", "#764ba2"],
        ["#f093fb", "#f5576c"],
        ["#4facfe", "#00f2fe"],
        ["#43e97b", "#38f9d7"],
        ["#fa709a", "#fee140"],
      ];
      const colors = gradients[slide.id - 1] || gradients[0];
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
    } else {
      gradient.addColorStop(0, "#8b5cf6");
      gradient.addColorStop(1, "#ec4899");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

    if (slide.templateId === "framed") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.roundRect(110, 434, 1100, 2000, 60);
      ctx.fill();
    }

    const overlay = slide.overlays[locale];
    
    if (!overlay) {
      console.warn(`No overlay for locale ${locale} on slide ${slide.id}, skipping`);
      continue;
    }

    const boxWidth = EXPORT_WIDTH * 0.85;
    const boxHeight = EXPORT_HEIGHT * 0.3;
    const boxX = (EXPORT_WIDTH - boxWidth) / 2;
    const boxY = (EXPORT_HEIGHT - boxHeight) / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 40);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const headlineFontSize = 80;
    ctx.font = `bold ${headlineFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const headlineY = boxY + boxHeight * 0.4;
    wrapText(ctx, overlay.headline, EXPORT_WIDTH / 2, headlineY, boxWidth * 0.9, headlineFontSize * 1.2);

    const subheadFontSize = 56;
    ctx.font = `${subheadFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#374151";
    const subheadY = boxY + boxHeight * 0.7;
    wrapText(ctx, overlay.subhead, EXPORT_WIDTH / 2, subheadY, boxWidth * 0.9, subheadFontSize * 1.2);

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
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
