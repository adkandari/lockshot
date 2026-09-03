import { SlideOverlay } from './types';

const EXPORT_WIDTH = 1320;
const EXPORT_HEIGHT = 2868;

export function measureOverflow(overlay: SlideOverlay, templateId?: string): boolean {
  if (typeof document === 'undefined') return false;
  
  // Empty overlay never overflows
  if (!overlay || (!overlay.headline && !overlay.subhead)) {
    return false;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Match the exact rendering parameters from export.ts for each template
  if (templateId === 'caption_top') {
    // Growth template: Roboto Condensed 110px uppercase + Courier Prime 58px
    const textPadding = 80;
    const maxWidth = EXPORT_WIDTH - textPadding * 2; // 1160px
    const availableHeight = 400; // From y=100 to phone y=500
    
    let totalUsed = 0;
    
    if (overlay.headline) {
      ctx.font = `700 110px Roboto Condensed, "Arial Narrow", Impact, sans-serif`;
      const headlineHeight = measureTextHeight(ctx, overlay.headline.toUpperCase(), maxWidth, 130);
      totalUsed += headlineHeight;
      
      // Gap after headline before subhead (matches export.ts line 290)
      if (overlay.subhead) {
        totalUsed += 150;
      }
    }
    
    if (overlay.subhead) {
      ctx.font = `700 58px Courier Prime, "Courier New", monospace`;
      const subheadHeight = measureTextHeight(ctx, overlay.subhead, maxWidth, 72);
      totalUsed += subheadHeight;
    }
    
    return totalUsed > availableHeight;
    
  } else if (templateId === 'framed_on_gradient') {
    // Bold template: System font 140px, headline only
    const maxWidth = EXPORT_WIDTH * 0.85; // 1122px
    const lineHeight = 160;
    
    if (!overlay.headline) return false;
    
    ctx.font = `900 140px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
    const headlineHeight = measureTextHeight(ctx, overlay.headline, maxWidth, lineHeight);
    
    // Bold has generous space; use conservative estimate
    const availableHeight = 800;
    return headlineHeight > availableHeight;
    
  } else {
    // Perfect template (full_bleed_caption_bottom) and default: System font 120px + 56px
    const textPadding = 100;
    const maxWidth = EXPORT_WIDTH - textPadding * 2; // 1120px
    const availableHeight = 290; // From y=60 to phone y=350
    
    let totalUsed = 0;
    
    if (overlay.headline) {
      ctx.font = `900 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
      const headlineHeight = measureTextHeight(ctx, overlay.headline, maxWidth, 140);
      totalUsed += headlineHeight;
    }
    
    if (overlay.subhead) {
      ctx.font = `56px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`;
      const subheadHeight = measureTextHeight(ctx, overlay.subhead, maxWidth, 70);
      totalUsed += subheadHeight;
    }
    
    return totalUsed > availableHeight;
  }
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
  slides: Array<{ overlays: Record<string, SlideOverlay>; templateId?: string }>,
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
