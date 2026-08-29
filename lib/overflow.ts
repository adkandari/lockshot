import { SlideOverlay } from './types';

const EXPORT_WIDTH = 1320;
const EXPORT_HEIGHT = 2868;

export function measureOverflow(overlay: SlideOverlay): boolean {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const boxWidth = EXPORT_WIDTH * 0.85;
  const boxHeight = EXPORT_HEIGHT * 0.3;
  const maxWidth = boxWidth * 0.9;

  const headlineFontSize = 80;
  ctx.font = `bold ${headlineFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const headlineHeight = measureTextHeight(ctx, overlay.headline, maxWidth, headlineFontSize * 1.2);

  const subheadFontSize = 56;
  ctx.font = `${subheadFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const subheadHeight = measureTextHeight(ctx, overlay.subhead, maxWidth, subheadFontSize * 1.2);

  const totalHeight = headlineHeight + subheadHeight + 40;
  const availableHeight = boxHeight * 0.8;

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
  slides: Array<{ overlays: Record<string, SlideOverlay> }>,
  locales: string[]
): Record<number, Record<string, boolean>> {
  const overflows: Record<number, Record<string, boolean>> = {};

  slides.forEach((slide, index) => {
    overflows[index + 1] = {};
    locales.forEach(locale => {
      const overlay = slide.overlays[locale];
      if (overlay) {
        overflows[index + 1][locale] = measureOverflow(overlay);
      }
    });
  });

  return overflows;
}
