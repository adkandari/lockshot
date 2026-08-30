"use client";

import { SlideData, Locale } from "@/lib/types";
import { useRef, useEffect, useState } from "react";
import { createImageURL } from "@/lib/imageStorage";

interface SlideCardProps {
  slide: SlideData;
  currentLocale: Locale;
  onToggleLock: (slideId: number) => void;
  onFileUpload: (file: File) => void;
}

export default function SlideCard({
  slide,
  currentLocale,
  onToggleLock,
  onFileUpload,
}: SlideCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const overlay = slide.overlays[currentLocale] || { headline: '', subhead: '' };
  const isOverflowing = slide.overflow[currentLocale] || false;
  const isLocked = slide.locked;
  const hasOverlay = overlay.headline || overlay.subhead;

  useEffect(() => {
    if (slide.imageKey) {
      createImageURL(slide.imageKey).then(url => {
        if (url) setImageUrl(url);
      });
    } else if (slide.backgroundImage) {
      setImageUrl(slide.backgroundImage);
    }
    
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [slide.imageKey, slide.backgroundImage]);

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
      case "caption_top":
        return (
          <>
            {hasOverlay && (
              <div className="absolute top-0 left-0 right-0 z-10">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-8 py-10">
                  {overlay.headline && (
                    <h2 className={`text-2xl font-bold text-white leading-tight mb-2 ${isOverflowing ? 'text-red-300' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.headline}
                    </h2>
                  )}
                  {overlay.subhead && (
                    <p className={`text-base text-white/95 leading-snug ${isOverflowing ? 'text-red-200' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.subhead}
                    </p>
                  )}
                </div>
              </div>
            )}
            {imageUrl && (
              <div className={`absolute inset-0 ${hasOverlay ? 'top-32' : 'top-0'}`}>
                <div className={hasOverlay ? 'h-full px-4' : 'h-full'}>
                  <img
                    src={imageUrl}
                    alt={`Slide ${slide.id}`}
                    className="w-full h-full object-cover"
                    style={hasOverlay ? { borderRadius: '0.5rem' } : {}}
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            )}
          </>
        );

      case "framed_on_gradient":
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-indigo-700 to-purple-700" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-12">
              {hasOverlay && (
                <div className="text-center mb-8 z-10 max-w-[85%]">
                  {overlay.headline && (
                    <h2 className={`text-3xl font-bold text-white leading-tight mb-3 ${isOverflowing ? 'text-red-300' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.headline}
                    </h2>
                  )}
                  {overlay.subhead && (
                    <p className={`text-lg text-white/90 leading-relaxed ${isOverflowing ? 'text-red-200' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                      {overlay.subhead}
                    </p>
                  )}
                </div>
              )}
              {imageUrl && (
                <div className="relative w-[68%] aspect-[9/19.5] bg-black rounded-[3rem] shadow-2xl overflow-hidden ring-8 ring-black/20">
                  <div className="absolute inset-0 rounded-[3rem] ring-1 ring-white/10 ring-inset"></div>
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

      case "full_bleed_caption_bottom":
      default:
        return (
          <>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Slide ${slide.id}`}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400" />
            )}
            {hasOverlay && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-md px-8 py-8 z-10">
                {overlay.headline && (
                  <h2 className={`text-2xl font-bold text-white leading-tight mb-2.5 ${isOverflowing ? 'text-red-300' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                    {overlay.headline}
                  </h2>
                )}
                {overlay.subhead && (
                  <p className={`text-base text-gray-100 leading-snug ${isOverflowing ? 'text-red-200' : ''}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
                    {overlay.subhead}
                  </p>
                )}
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
