"use client";

import { SlideData, Locale } from "@/lib/types";
import { useRef } from "react";

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
  const overlay = slide.overlays[currentLocale] || { headline: '', subhead: '' };
  const isOverflowing = slide.overflow[currentLocale] || false;
  const isLocked = slide.locked;
  const hasOverlay = overlay.headline || overlay.subhead;

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileUpload(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative group">
        <div className="aspect-[1320/2868] bg-gradient-to-br from-purple-500 to-pink-500 relative overflow-hidden">
          <img
            src={slide.backgroundImage}
            alt={`Slide ${slide.id}`}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
          
          {hasOverlay && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm px-6 py-4">
              {overlay.headline && (
                <h2 className={`text-lg font-bold text-white mb-1 ${isOverflowing ? 'text-red-300' : ''}`}>
                  {overlay.headline}
                </h2>
              )}
              {overlay.subhead && (
                <p className={`text-sm text-gray-200 ${isOverflowing ? 'text-red-200' : ''}`}>
                  {overlay.subhead}
                </p>
              )}
            </div>
          )}

          {isOverflowing && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Overflow
            </div>
          )}

          {isLocked && (
            <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
              🔒 Locked
            </div>
          )}

          <button
            onClick={handleFileClick}
            className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
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
