import { SlideOverlay, TemplateId } from './types';

const EXPORT_WIDTH = 1320;
const EXPORT_HEIGHT = 2868;

export function measureOverflow(overlay: SlideOverlay, templateId?: TemplateId): boolean {
  if (typeof document === 'undefined') return false;
  
  // Empty overlays never overflow
  if (!overlay.headline && !overlay.subhead) return false;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Bold/framed_on_gradient has no subhead, so only check headline
  if (templateId === 'framed_on_gradient') {
    // For Bold template, only headline is shown
    if (!overlay.headline) return false;
    
    const boxWidth = EXPORT_WIDTH - 200;
    const maxWidth = boxWidth * 0.85;
    const headlineFontSize = 120;
    ctx.font = `900 ${headlineFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
    const headlineHeight = measureTextHeight(ctx, overlay.headline, maxWidth, headlineFontSize * 1.15);
    
    // Bold template has more space for headline
    return headlineHeight > 400;
  }

  // Measurements for Perfect and Growth top caption areas
  const boxWidth = EXPORT_WIDTH - 200; // 100px padding on each side
  const boxHeight = 320; // Top caption area
  const maxWidth = boxWidth * 0.95;

  const headlineFontSize = 120;
  ctx.font = `900 ${headlineFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
  const headlineHeight = measureTextHeight(ctx, overlay.headline, maxWidth, headlineFontSize * 1.15);

  const subheadFontSize = 64;
  ctx.font = `${subheadFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
  const subheadHeight = measureTextHeight(ctx, overlay.subhead, maxWidth, subheadFontSize * 1.25);

  const totalHeight = headlineHeight + subheadHeight + 60; // padding between headline/subhead
  const availableHeight = boxHeight;

  return totalHeight > availableHeight;
}

function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      lineCount++;
      line = words[i] + ' ';
    } else {
      line = testLine;
    }
  }
  lineCount++;

  return lineCount * lineHeight;
}

export function measureAllOverflows(
  slides: Array<{ overlays: Record<string, SlideOverlay>; templateId?: TemplateId }>,
  locales: string[]
): Record<number, Record<string, boolean>> {
  const overflows: Record<number, Record<string, boolean>> = {};

  slides.forEach((slide, index) => {
    overflows[index + 1] = {};
    locales.forEach(locale => {
      const overlay = slide.overlays[locale];
      if (overlay) {
        overflows[index + 1][locale] = measureOverflow(overlay, slide.templateId);
      }
    });
  });

  return overflows;
}
