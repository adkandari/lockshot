"use client";

import { useEffect, useState, useRef } from "react";
import { Locale, SlideData } from "@/lib/types";
import { HABIT_APP, LOCALES } from "@/lib/sampleData";
import { exportZip } from "@/lib/export";
import { registerWebMCPTools, getWebMCPState } from "@/lib/webmcp";
import SlideCard from "./SlideCard";

let registrationStarted = false;

export default function LockhotDesk() {
  const [slides, setSlides] = useState<SlideData[]>(HABIT_APP.slides);
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const [webMcpState, setWebMcpState] = useState({ enabled: false, error: null as string | null });
  
  const slidesRef = useRef(slides);
  const currentLocaleRef = useRef(currentLocale);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    currentLocaleRef.current = currentLocale;
  }, [currentLocale]);

  useEffect(() => {
    if (registrationStarted) {
      setWebMcpState(getWebMCPState());
      return;
    }

    registrationStarted = true;

    registerWebMCPTools(
      () => slidesRef.current,
      () => currentLocaleRef.current,
      setSlides,
      setCurrentLocale,
      exportZip
    ).then(() => {
      setWebMcpState(getWebMCPState());
    });
  }, []);

  const toggleLock = (slideId: number) => {
    setSlides(prev =>
      prev.map(s => (s.id === slideId ? { ...s, locked: !s.locked } : s))
    );
  };

  const handleExport = async () => {
    await exportZip(slides, currentLocale);
  };

  const statusText = webMcpState.error 
    ? `WebMCP Error: ${webMcpState.error}`
    : webMcpState.enabled 
      ? "WebMCP Active" 
      : "WebMCP Not Detected";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lockshot</h1>
            <p className="text-gray-600 mt-1">
              App Store Screenshot Localization Desk
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  webMcpState.enabled ? "bg-green-500" : webMcpState.error ? "bg-red-500" : "bg-gray-300"
                }`}
              />
              <span className={`text-gray-600 ${webMcpState.error ? "text-red-600" : ""}`}>
                {statusText}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Locale:
            </label>
            <select
              value={currentLocale}
              onChange={(e) => setCurrentLocale(e.target.value as Locale)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LOCALES.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {locale.flag} {locale.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Export ZIP
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            currentLocale={currentLocale}
            onToggleLock={toggleLock}
          />
        ))}
      </div>
    </div>
  );
}
