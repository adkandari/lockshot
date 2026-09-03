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
  const [extractedColors, setExtractedColors] = useState<{ light: string; dark: string; text: string } | null>(null);
  
  const overlay = slide.overlays[currentLocale] || { headline: '', subhead: '' };
  const isOverflowing = slide.overflow[currentLocale] || false;
  const isLocked = slide.locked;
  const hasOverlay = overlay.headline || overlay.subhead;

  useEffect(() => {
    if (slide.imageKey) {
      createImageURL(slide.imageKey).then(url => {
        if (url) {
          setImageUrl(url);
          // Extract color for Perfect and Growth templates
          if (slide.templateId === 'full_bleed_caption_bottom' || slide.templateId === 'caption_top') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
              const colors = await extractDominantColor(img);
              setExtractedColors(colors);
            };
            img.src = url;
          }
        }
      });
    } else if (slide.backgroundImage) {
      setImageUrl(slide.backgroundImage);
      if (slide.templateId === 'full_bleed_caption_bottom' || slide.templateId === 'caption_top') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
          const colors = await extractDominantColor(img);
          setExtractedColors(colors);
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
    // Special case: Campaign slide for Growth template
    if (slide.kind === "campaign") {
      const colors = extractedColors || { light: 'rgb(245, 242, 237)', dark: 'rgb(138, 154, 123)', text: 'rgb(74, 55, 40)' };
      const accentColor = colors.dark;
      const textColor = colors.text;
      
      return (
        <>
          {/* Cream canvas */}
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: colors.light }}
          />
          
          {/* Organic blobs */}
          <div 
            className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-35 blur-3xl"
            style={{ backgroundColor: accentColor, transform: 'translate(25%, -25%)' }}
          />
          <div 
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: accentColor, transform: 'translate(-25%, 25%)' }}
          />
          
          {/* Stacked headline with last word in accent */}
          {hasOverlay && (
            <div className="absolute top-10 left-0 right-0 px-8 z-20">
              {overlay.headline && (() => {
                const words = overlay.headline.split(/\s+/);
                const lastWord = words[words.length - 1];
                const otherWords = words.slice(0, -1).join(' ');
                
                return (
                  <div className="mb-3">
                    {otherWords && (
                      <h2 
                        className="text-3xl font-black leading-tight lowercase" 
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: textColor }}
                      >
                        {otherWords}
                      </h2>
                    )}
                    <h2 
                      className="text-3xl font-black leading-tight lowercase relative inline-block" 
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: accentColor }}
                    >
                      {lastWord}
                      {/* Simple squiggle underline */}
                      <svg 
                        className="absolute left-0 -bottom-1 w-full h-2" 
                        viewBox="0 0 100 8" 
                        preserveAspectRatio="none"
                        style={{ opacity: 0.7 }}
                      >
                        <path 
                          d="M 0 4 Q 25 0, 50 4 T 100 4" 
                          fill="none" 
                          stroke={accentColor} 
                          strokeWidth="2"
                        />
                      </svg>
                    </h2>
                  </div>
                );
              })()}
              {overlay.subhead && (
                <p 
                  className="text-sm leading-relaxed mt-2" 
                  style={{ fontFamily: 'var(--font-source-serif)', color: textColor, opacity: 0.75 }}
                >
                  {overlay.subhead}
                </p>
              )}
            </div>
          )}
          
          {/* Lifestyle photo in rounded rect on right/bottom */}
          {imageUrl ? (
            <div className="absolute bottom-8 right-8 w-1/2 h-2/3 rounded-3xl overflow-hidden shadow-xl">
              <img
                src={imageUrl}
                alt="Campaign lifestyle"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-sm">Drop lifestyle photo</p>
              </div>
            </div>
          )}
        </>
      );
    }
    
    switch (slide.templateId) {
      case "caption_top": // Growth: Cream campaign energy with top type
        // Normalize colors from either slide overrides or auto-sampled
        const growthNormalizedColors = {
          text: slide.colors?.text || extractedColors?.text || 'rgb(74, 55, 40)',
          background: slide.colors?.background || extractedColors?.light || 'rgb(245, 242, 237)',
          accent: slide.colors?.accent || extractedColors?.dark || 'rgb(138, 154, 123)',
        };
        
        return (
          <>
            {/* Warm cream canvas */}
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: growthNormalizedColors.background }}
            />
            
            {/* Soft organic blobs in corners */}
            <div 
              className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-40 blur-3xl"
              style={{ backgroundColor: growthNormalizedColors.accent, transform: 'translate(-30%, -30%)' }}
            />
            <div 
              className="absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: growthNormalizedColors.accent, transform: 'translate(30%, 30%)' }}
            />
            
            {/* Flex column layout: type band + phone area */}
            <div className="absolute inset-0 flex flex-col">
              {/* Type band at top - flex-shrink-0 with container-relative sizing */}
              {hasOverlay && (
                <div className="flex-shrink-0 z-20" style={{ padding: '2.8cqh 2.8cqw' }}>
                  {overlay.headline && (
                    <h2 
                      className={`font-black leading-tight tracking-wide uppercase ${isOverflowing ? 'opacity-60' : ''}`} 
                      style={{ 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', 
                        color: growthNormalizedColors.accent,
                        fontSize: '8cqw',
                        marginBottom: '0.7cqh'
                      }}
                    >
                      {overlay.headline}
                    </h2>
                  )}
                  {overlay.subhead && (
                    <p 
                      className={`leading-relaxed ${isOverflowing ? 'opacity-60' : ''}`} 
                      style={{ 
                        fontFamily: 'var(--font-source-serif)', 
                        color: growthNormalizedColors.text, 
                        opacity: 0.85,
                        fontSize: '4cqw'
                      }}
                    >
                      {overlay.subhead}
                    </p>
                  )}
                </div>
              )}
              
              {/* Phone area - flex-1 with items-center, no stretch */}
              <div className="flex-1 min-h-0 flex items-center justify-center" style={{ padding: '1.4cqh 0' }}>
                {imageUrl ? (
                  <div className="relative w-[70%] max-h-full bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center" style={{ padding: '0.2cqh', border: '2px solid #1a1a1a' }}>
                    <img
                      src={imageUrl}
                      alt={`Slide ${slide.id}`}
                      className="w-full h-auto max-h-full object-contain rounded-[1.8rem] bg-black"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-[70%] aspect-[9/19.5] bg-gray-200 rounded-[2rem] flex items-center justify-center text-gray-400" style={{ border: '2px solid #ccc' }}>
                    <span className="text-xs">No screenshot</span>
                  </div>
                )}
              </div>
            </div>
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

      case "full_bleed_caption_bottom": // Perfect: Organic background + centered phone
      default:
        // Normalize colors from either slide overrides or auto-sampled
        const normalizedColors = {
          text: slide.colors?.text || extractedColors?.text || 'rgb(109, 40, 217)',
          background: slide.colors?.background || extractedColors?.light || 'rgb(243, 232, 255)',
          accent: slide.colors?.accent || extractedColors?.dark || 'rgb(196, 181, 253)',
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
            
            {/* Flex column layout: type band + phone area */}
            <div className="absolute inset-0 flex flex-col">
              {/* Type band - flex-shrink-0 with container-relative sizing */}
              {hasOverlay && (
                <div className="flex-shrink-0 z-20" style={{ padding: '2.1cqh 3.5cqw' }}>
                  {overlay.headline && (
                    <h2 
                      className={`font-black leading-tight tracking-tight ${isOverflowing ? 'opacity-60' : ''}`} 
                      style={{ 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', 
                        color: normalizedColors.text,
                        fontSize: '9cqw',
                        marginBottom: '0.7cqh'
                      }}
                    >
                      {overlay.headline}
                    </h2>
                  )}
                  {overlay.subhead && (
                    <p 
                      className={`leading-snug ${isOverflowing ? 'opacity-60' : ''}`} 
                      style={{ 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', 
                        color: normalizedColors.text, 
                        opacity: 0.8,
                        fontSize: '4cqw'
                      }}
                    >
                      {overlay.subhead}
                    </p>
                  )}
                </div>
              )}
              
              {/* Phone area - flex-1 with items-center, no stretch */}
              <div className="flex-1 min-h-0 flex items-center justify-center" style={{ padding: '1.4cqh 0' }}>
                {imageUrl ? (
                  <div className="relative w-[74%] max-h-full bg-black rounded-[2.5rem] shadow-2xl flex items-center justify-center" style={{ padding: '0.3cqh' }}>
                    <img
                      src={imageUrl}
                      alt={`Slide ${slide.id}`}
                      className="w-full h-auto max-h-full object-contain rounded-[2.2rem]"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-[74%] aspect-[9/19.5] bg-gray-200 rounded-[2.5rem] flex items-center justify-center text-gray-400">
                    <span className="text-sm">No screenshot</span>
                  </div>
                )}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative group">
        <div className="aspect-[1320/2868] relative overflow-hidden bg-gray-100 [container-type:size]">
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

        {/* Color pickers for Perfect template */}
        {slide.templateId === 'full_bleed_caption_bottom' && onColorChange && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Perfect Colors:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Text:</span>
                <input
                  type="color"
                  value={slide.colors?.text || (extractedColors?.text || '#6d28d9')}
                  onChange={(e) => {
                    onColorChange(slide.id, { ...slide.colors, text: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Bg:</span>
                <input
                  type="color"
                  value={slide.colors?.background || (extractedColors?.light || '#f3e8ff')}
                  onChange={(e) => {
                    onColorChange(slide.id, { ...slide.colors, background: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Accent:</span>
                <input
                  type="color"
                  value={slide.colors?.accent || (extractedColors?.dark || '#c4b5fd')}
                  onChange={(e) => {
                    onColorChange(slide.id, { ...slide.colors, accent: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              {slide.colors && (
                <button
                  onClick={() => {
                    onColorChange(slide.id, {});
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

        {/* Color pickers for Growth template */}
        {slide.templateId === 'caption_top' && slide.kind !== 'campaign' && onColorChange && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Growth Colors:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Text:</span>
                <input
                  type="color"
                  value={slide.colors?.text || (extractedColors?.text || '#4a3728')}
                  onChange={(e) => {
                    onColorChange(slide.id, { ...slide.colors, text: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Bg:</span>
                <input
                  type="color"
                  value={slide.colors?.background || (extractedColors?.light || '#f5f2ed')}
                  onChange={(e) => {
                    onColorChange(slide.id, { ...slide.colors, background: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Accent:</span>
                <input
                  type="color"
                  value={slide.colors?.accent || (extractedColors?.dark || '#8a9a7b')}
                  onChange={(e) => {
                    onColorChange(slide.id, { ...slide.colors, accent: e.target.value });
                  }}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              {slide.colors && (
                <button
                  onClick={() => {
                    onColorChange(slide.id, {});
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
