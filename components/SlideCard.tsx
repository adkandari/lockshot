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
  onOverlayChange?: (slideId: number, headline: string, subhead: string) => void;
}

export default function SlideCard({
  slide,
  currentLocale,
  onToggleLock,
  onFileUpload,
  onColorChange,
  onOverlayChange,
}: SlideCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<{ light: string; dark: string; text: string } | null>(null);
  
  const overlay = slide.overlays[currentLocale] || { headline: '', subhead: '', author: undefined };
  const isOverflowing = slide.overflow[currentLocale] || false;
  const isLocked = slide.locked;
  const hasOverlay = overlay.headline || overlay.subhead;

  useEffect(() => {
    if (slide.imageKey) {
      createImageURL(slide.imageKey).then(url => {
        if (url) {
          setImageUrl(url);
          // Extract color ONLY for Perfect template (full_bleed_caption_bottom)
          // Growth uses fixed Dysperse palette
          if (slide.templateId === 'full_bleed_caption_bottom') {
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
      if (slide.templateId === 'full_bleed_caption_bottom') {
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
      // Fixed Growth palette for campaign slides (from PR #25)
      const colors = { light: 'rgb(243, 232, 218)', dark: 'rgb(112, 125, 93)', text: 'rgb(68, 57, 45)' };
      const terracotta = 'rgb(195, 123, 84)';
      
      return (
        <>
          {/* Cream canvas */}
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: colors.light }}
          />
          
          {/* Sage blob lower-left */}
          <div 
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-40 blur-3xl"
            style={{ backgroundColor: colors.dark, transform: 'translate(-25%, 25%)' }}
          />
          
          {/* DO NOT render overlay type - it's baked into the generated image */}
          
          {/* Lifestyle photo RIGHT/bottom - rounded rect, object-cover, NOT a phone */}
          {imageUrl ? (
            <div className="absolute bottom-8 right-8 top-20 w-[48%] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={imageUrl}
                alt="Campaign lifestyle"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="absolute bottom-8 right-8 top-20 w-[48%] rounded-3xl bg-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-sm">Drop campaign graphic</p>
                <p className="text-xs mt-1">Type baked in</p>
              </div>
            </div>
          )}
        </>
      );
    }
    
    switch (slide.templateId) {
      case "caption_top": // Growth: Cream campaign energy with top type
        // Fixed Growth palette (user overrides take precedence)
        const growthNormalizedColors = {
          text: slide.colors?.text || 'rgb(68, 57, 45)',
          background: slide.colors?.background || 'rgb(243, 232, 218)',
          accent: slide.colors?.accent || 'rgb(112, 125, 93)',
        };
        const terracotta = 'rgb(195, 123, 84)';
        
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
              style={{ backgroundColor: terracotta, transform: 'translate(-30%, -30%)' }}
            />
            <div 
              className="absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: terracotta, transform: 'translate(30%, 30%)' }}
            />
            
            {/* Flex column layout: type band + phone area */}
            <div className="absolute inset-0 flex flex-col">
              {/* Type band at top - flex-shrink-0 with container-relative sizing */}
              {hasOverlay && (
                <div className="flex-shrink-0 z-20" style={{ padding: '2.8cqh 2.8cqw' }}>
                  {overlay.headline && (
                    <h2 
                      className={`font-black leading-tight tracking-tight uppercase ${isOverflowing ? 'opacity-60' : ''}`} 
                      style={{ 
                        fontFamily: 'var(--font-roboto-condensed), "Arial Narrow", Impact, sans-serif', 
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
                        fontFamily: 'var(--font-courier-prime), "Courier New", monospace', 
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

      case "framed_on_gradient": // Bold: Dark navy + lavender
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
            <div className="absolute inset-0 flex flex-col items-center px-8 py-12">
              {hasOverlay && overlay.headline && (
                <div className="text-center mb-6 z-10 max-w-[85%]">
                  <h2 className={`text-4xl font-black text-white leading-tight ${isOverflowing ? 'text-red-200' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                    {overlay.headline}
                  </h2>
                </div>
              )}
              {imageUrl && (
                <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
                  <div className="relative w-[80%] max-h-full rounded-[2rem] overflow-hidden" style={{ border: '8px solid rgba(196, 181, 253, 0.4)' }}>
                    <img
                      src={imageUrl}
                      alt={`Slide ${slide.id}`}
                      className="w-full h-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
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
    <div className="bg-surface rounded-[22px] shadow-card overflow-hidden">
      <div className="relative group">
        <div className="aspect-[1320/2868] relative overflow-hidden bg-gray-100 [container-type:size]">
          {renderTemplate()}

          {isOverflowing && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium z-20">
              Overflow
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-line-soft">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-jetbrains text-ink-2">
            #{slide.id}
          </span>
          <button
            onClick={() => onToggleLock(slide.id)}
            className="text-base text-ink-3 hover:text-ink transition-colors"
          >
            {isLocked ? "🔒" : "🔓"}
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <div className="text-[11px] text-ink-3 mb-1">
              Headline
              {overlay.author && (
                <span className="ml-1.5 text-[10px] text-ink-3">
                  · {overlay.author === 'model' ? 'ChatGPT' : 'Edited'}
                </span>
              )}
            </div>
            <input
              type="text"
              value={overlay.headline || ''}
              placeholder="Ask the model"
              onChange={(e) => {
                if (onOverlayChange) {
                  onOverlayChange(slide.id, e.target.value, overlay.subhead || '');
                }
              }}
              className="w-full px-2 py-1.5 text-sm text-ink bg-surface border border-line rounded-[9px]"
            />
          </div>
          {slide.templateId !== 'framed_on_gradient' && (
            <div>
              <div className="text-[11px] text-ink-3 mb-1">
                Subhead
                {overlay.author && (
                  <span className="ml-1.5 text-[10px] text-ink-3">
                    · {overlay.author === 'model' ? 'ChatGPT' : 'Edited'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={overlay.subhead || ''}
                placeholder="Ask the model"
                onChange={(e) => {
                  if (onOverlayChange) {
                    onOverlayChange(slide.id, overlay.headline || '', e.target.value);
                  }
                }}
                className="w-full px-2 py-1.5 text-sm text-ink bg-surface border border-line rounded-[9px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
