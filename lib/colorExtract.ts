// Extract dominant color from image and derive light/dark variants
export async function extractDominantColor(
  imgElement: HTMLImageElement
): Promise<{ light: string; dark: string; text: string }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return getFallbackColors();
  }

  // Sample a small version for performance
  const sampleSize = 50;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  
  try {
    ctx.drawImage(imgElement, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;
    
    let r = 0, g = 0, b = 0;
    const pixelCount = sampleSize * sampleSize;
    
    // Average color
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    
    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);
    
    return deriveColorVariants(r, g, b);
  } catch (e) {
    return getFallbackColors();
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function deriveColorVariants(r: number, g: number, b: number): {
  light: string;
  dark: string;
  text: string;
} {
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Light variant: boost lightness, slightly desaturate
  const lightL = Math.min(92, Math.max(85, l + 30));
  const lightS = Math.max(40, s * 0.7);
  const [lr, lg, lb] = hslToRgb(h, lightS, lightL);
  
  // Dark variant: reduce lightness, saturate slightly
  const darkL = Math.min(65, Math.max(50, l - 10));
  const darkS = Math.min(70, s * 1.2);
  const [dr, dg, db] = hslToRgb(h, darkS, darkL);
  
  // Text color: very dark variant
  const textL = Math.min(30, Math.max(20, l - 40));
  const textS = Math.min(80, s * 1.3);
  const [tr, tg, tb] = hslToRgb(h, textS, textL);
  
  return {
    light: `rgb(${lr}, ${lg}, ${lb})`,
    dark: `rgb(${dr}, ${dg}, ${db})`,
    text: `rgb(${tr}, ${tg}, ${tb})`,
  };
}

function getFallbackColors(): { light: string; dark: string; text: string } {
  return {
    light: 'rgb(243, 232, 255)', // violet-100
    dark: 'rgb(196, 181, 253)', // violet-300
    text: 'rgb(109, 40, 217)', // violet-700
  };
}
