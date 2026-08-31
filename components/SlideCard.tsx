"use client";

import { SlideData, Locale } from "@/lib/types";
import { useRef, useEffect, useState } from "react";
import { createImageURL } from "@/lib/imageStorage";
import { extractDominantColor } from "@/lib/colorExtract";

interface SlideCardProps {
  slide: SlideData;
  currentLocale: Locale;
  onToggleLock: (slideId: number) => void;
  onFileUpload: (file: File) => void;
  onColorChange?: (slideId: number, colors: { text?: string; background?: string; accent?: string }) => void;
}

export default function SlideCard({
  slide,
  currentLocale,
  onToggleLock,
  onFileUpload,
  onColorChange,
}: SlideCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [kovaColors, setKovaColors] = useState<{ light: string; dark: string; text: string } | null>(null);
  
  const overlay = slide.overlays[currentLocale] || { headline: '', subhead: '' };
  const isOverflowing = slide.overflow[currentLocale] || false;
  const isLocked = slide.locked;
  const hasOverlay = overlay.headline || overlay.subhead;

  useEffect(() => {
    if (slide.imageKey) {
      createImageURL(slide.imageKey).then(url => {
        if (url) {
          setImageUrl(url);
          // Extract color for Kova template
          if (slide.templateId === 'full_bleed_caption_bottom') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
              const colors = await extractDominantColor(img);
              setKovaColors(colors);
            };
            img.src = url;
          }
        }
      });
    } else if (slide.backgroundImage) {
      setImageUrl(slide.backgroundImage);
      if (slide.templateId === 'full_bleed_caption_bottom') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
          const colors = await extractDominantColor(img);
          setKovaColors(colors);
        };
        img.src = slide.backgroundImage;
      }
    }
    
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [slide.imageKey, slide.backgroundImage, slide.templateId]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileUpload(file);
    }
  };

  const renderTemplate = () => {
    switch (slide.templateId) {
      case "caption_top": // Pluto: Clean SaaS blue/white
        return (
          <>
            {hasOverlay && (
              <div className="absolute top-0 left-0 right-0 z-10">
                <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-10 py-12">
                  {overlay.headline && (
                    <h2 className={`text-3xl font-extrabold text-white leading-tight mb-3 tracking-tight ${isOverflowing ? 'text-red-100' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.headline}
                    </h2>
                  )}
                  {overlay.subhead && (
                    <p className={`text-base text-white/95 leading-relaxed ${isOverflowing ? 'text-red-100' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.subhead}
                    </p>
                  )}
                </div>
              </div>
            )}
            {imageUrl && (
              <div className={`absolute inset-0 ${hasOverlay ? 'top-40' : 'top-0'} bg-white`}>
                <div className={hasOverlay ? 'h-full px-6 py-4' : 'h-full'}>
                  <img
                    src={imageUrl}
                    alt={`Slide ${slide.id}`}
                    className="w-full h-full object-cover rounded-2xl shadow-xl"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            )}
          </>
        );

      case "framed_on_gradient": // Astra: Dark navy + lavender
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-12">
              {hasOverlay && (
                <div className="text-center mb-10 z-10 max-w-[85%]">
                  {overlay.headline && (
                    <h2 className={`text-4xl font-black text-white leading-tight mb-4 ${isOverflowing ? 'text-red-200' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.headline}
                    </h2>
                  )}
                  {overlay.subhead && (
                    <p className={`text-lg text-purple-200 leading-relaxed ${isOverflowing ? 'text-red-200' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.subhead}
                    </p>
                  )}
                </div>
              )}
              {imageUrl && (
                <div className="relative w-[65%] aspect-[9/19.5] bg-black rounded-[3.5rem] shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 rounded-[3.5rem] ring-2 ring-purple-400/30 ring-inset"></div>
                  <img
                    src={imageUrl}
                    alt={`Slide ${slide.id}`}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </div>
          </>
        );

      case "gradient_only":
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600" />
            {hasOverlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                {overlay.headline && (
                  <h2 className={`text-3xl font-bold text-white mb-4 ${isOverflowing ? 'text-red-300' : ''}`}>
                    {overlay.headline}
                  </h2>
                )}
                {overlay.subhead && (
                  <p className={`text-xl text-white/90 ${isOverflowing ? 'text-red-200' : ''}`}>
                    {overlay.subhead}
                  </p>
                )}
              </div>
            )}
          </>
        );

      case "full_bleed_caption_bottom": // Kova: Organic background + centered phone
      default:
        // Normalize colors from either slide overrides or auto-sampled
        const normalizedColors = {
          text: slide.colors?.text || kovaColors?.text || 'rgb(109, 40, 217)',
          background: slide.colors?.background || kovaColors?.light || 'rgb(243, 232, 255)',
          accent: slide.colors?.accent || kovaColors?.dark || 'rgb(196, 181, 253)',
        };
        
        return (
          <>
            {/* Two-tone organic background */}
            <div 
              className="absolute inset-0" 
              style={{ background: `linear-gradient(135deg, ${normalizedColors.background} 0%, ${normalizedColors.background} 100%)` }}
            />
            
            {/* Organic blob shapes */}
            <div 
              className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-60 blur-3xl"
              style={{ backgroundColor: normalizedColors.accent, transform: 'translate(30%, -30%)' }}
            />
            <div 
              className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-50 blur-3xl"
              style={{ backgroundColor: normalizedColors.accent, transform: 'translate(-25%, 25%)' }}
            />
            
            {/* Headline at top */}
            {hasOverlay && (
              <div className="absolute top-12 left-0 right-0 px-10 z-20">
                {overlay.headline && (
                  <h2 
                    className={`text-3xl font-black leading-tight mb-3 tracking-tight ${isOverflowing ? 'opacity-60' : ''}`} 
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: normalizedColors.text }}
                  >
                    {overlay.headline}
                  </h2>
                )}
                {overlay.subhead && (
                  <p 
                    className={`text-base leading-relaxed ${isOverflowing ? 'opacity-60' : ''}`} 
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: normalizedColors.text, opacity: 0.8 }}
                  >
                    {overlay.subhead}
                  </p>
                )}
              </div>
            )}
            
            {/* Phone frame with screenshot */}
            {imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: hasOverlay ? '160px' : '0' }}>
                {/* Realistic iPhone bezel */}
                <div className="relative w-[58%] aspect-[9/19.5] bg-black rounded-[2.5rem] shadow-2xl p-1">
                  {/* Inner screen area with smaller radius */}
                  <div className="relative w-full h-full bg-black rounded-[2.2rem] overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Slide ${slide.id}`}
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Fallback if no image */}
            {!imageUrl && (
              <div 
                className="absolute inset-0 flex items-center justify-center text-gray-400"
                style={{ paddingTop: hasOverlay ? '160px' : '0' }}
              >
                <div className="w-[58%] aspect-[9/19.5] bg-gray-200 rounded-[2.5rem] flex items-center justify-center">
                  <span className="text-sm">No screenshot</span>
                </div>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative group">
        <div className="aspect-[1320/2868] relative overflow-hidden bg-gray-100">
          {renderTemplate()}

          {isOverflowing && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium z-20">
              Overflow
            </div>
          )}

          {isLocked && (
            <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium z-20">
              🔒 Locked
            </div>
          )}

          <button
            onClick={handleFileClick}
            className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white px-3 py-1 rounded-full text-xs font-medium transition-colors z-20"
          >
            📷 Change Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Slide {slide.id}
          </h3>
          <button
            onClick={() => onToggleLock(slide.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              isLocked
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isLocked ? "🔒 Locked" : "🔓 Unlocked"}
          </button>
        </div>

        {/* Color pickers for Kova template */}
        {slide.templateId === 'full_bleed_caption_bottom' && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Colors:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Text:</span>
                <input
                  type="color"
                  value={slide.colors?.text || (kovaColors?.text || '#6d28d9')}
                  onChange={(e) => {
                    onColorChange?.(slide.id, { ...slide.colors, text: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Bg:</span>
                <input
                  type="color"
                  value={slide.colors?.background || (kovaColors?.light || '#f3e8ff')}
                  onChange={(e) => {
                    onColorChange?.(slide.id, { ...slide.colors, background: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Accent:</span>
                <input
                  type="color"
                  value={slide.colors?.accent || (kovaColors?.dark || '#c4b5fd')}
                  onChange={(e) => {
                    onColorChange?.(slide.id, { ...slide.colors, accent: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              {slide.colors && (
                <button
                  onClick={() => {
                    onColorChange?.(slide.id, {});
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                  title="Reset to auto-sampled colors"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
        )}

        {slide.comments.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">
              Agent Comments:
            </p>
            {slide.comments.map((comment, idx) => (
              <div
                key={idx}
                className="text-xs bg-blue-50 text-blue-900 p-2 rounded border border-blue-200"
              >
                {comment}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs text-gray-500">
          <div className="truncate">
            <strong>Template:</strong> {slide.templateId.replace(/_/g, ' ')}
          </div>
          <div className="truncate">
            <strong>H:</strong> {overlay.headline || '(empty)'}
          </div>
          <div className="truncate">
            <strong>S:</strong> {overlay.subhead || '(empty)'}
          </div>
        </div>
      </div>
    </div>
  );
}
