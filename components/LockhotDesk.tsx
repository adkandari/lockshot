"use client";

import { useEffect, useState, useRef } from "react";
import { Locale, SlideData, PageState } from "@/lib/types";
import { HABIT_APP, LOCALES } from "@/lib/sampleData";
import { exportZip } from "@/lib/export";
import SlideCard from "./SlideCard";

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface ModelContext {
    registerTool(tool: {
      name: string;
      description: string;
      inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
      };
      annotations?: {
        readOnlyHint?: boolean;
      };
      execute: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
      abortSignal?: AbortSignal;
    }): void;
  }
}

export default function LockhotDesk() {
  const [slides, setSlides] = useState<SlideData[]>(HABIT_APP.slides);
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const [webMcpEnabled, setWebMcpEnabled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const modelContext = 
      (typeof document !== "undefined" && document.modelContext) ||
      (typeof navigator !== "undefined" && navigator.modelContext);

    if (!modelContext) {
      console.log("WebMCP not detected");
      return;
    }

    setWebMcpEnabled(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const getPageState = {
      name: "get_page_state",
      description: "Get the current page state including locale, all slide overlays, locked status, overflow flags, and comments",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async () => {
        return {
          currentLocale,
          slides: slides.map(slide => ({
            id: slide.id,
            headline: slide.overlays[currentLocale].headline,
            subhead: slide.overlays[currentLocale].subhead,
            locked: slide.locked,
            overflow: slide.overflow[currentLocale],
            comments: slide.comments,
          })),
        };
      },
      abortSignal: controller.signal,
    };

    const setLocale = {
      name: "set_locale",
      description: "Switch to a different locale (en, de, es, ja)",
      inputSchema: {
        type: "object" as const,
        properties: {
          locale: {
            type: "string",
            enum: ["en", "de", "es", "ja"],
            description: "Target locale code",
          },
        },
        required: ["locale"],
      },
      execute: async (params: Record<string, unknown>) => {
        const locale = params.locale as Locale;
        if (!["en", "de", "es", "ja"].includes(locale)) {
          return { success: false, error: "Invalid locale" };
        }
        setCurrentLocale(locale);
        return {
          success: true,
          newLocale: locale,
          message: `Switched to ${locale}`,
        };
      },
      abortSignal: controller.signal,
    };

    const setOverlay = {
      name: "set_overlay",
      description: "Set headline and/or subhead for a specific slide in the current locale. Does not affect locked slides.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slide: {
            type: "number",
            description: "Slide ID (1-5)",
          },
          headline: {
            type: "string",
            description: "New headline text (optional)",
          },
          subhead: {
            type: "string",
            description: "New subhead text (optional)",
          },
        },
        required: ["slide"],
      },
      execute: async (params: Record<string, unknown>) => {
        const slideId = params.slide as number;
        const headline = params.headline as string | undefined;
        const subhead = params.subhead as string | undefined;

        const slide = slides.find(s => s.id === slideId);
        if (!slide) {
          return { success: false, error: "Slide not found" };
        }

        if (slide.locked) {
          return {
            success: false,
            error: `Slide ${slideId} is locked`,
            locked: true,
          };
        }

        setSlides(prev => prev.map(s => {
          if (s.id === slideId) {
            const updated = { ...s };
            if (headline !== undefined) {
              updated.overlays[currentLocale].headline = headline;
            }
            if (subhead !== undefined) {
              updated.overlays[currentLocale].subhead = subhead;
            }
            return updated;
          }
          return s;
        }));

        return {
          success: true,
          slideId,
          newHeadline: headline || slide.overlays[currentLocale].headline,
          newSubhead: subhead || slide.overlays[currentLocale].subhead,
          diff: `Updated slide ${slideId}`,
        };
      },
      abortSignal: controller.signal,
    };

    const checkOverflow = {
      name: "check_overflow",
      description: "Check overflow status for all slides in the current locale",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async () => {
        const overflowStatus = slides.map(slide => ({
          slideId: slide.id,
          overflow: slide.overflow[currentLocale],
          headline: slide.overlays[currentLocale].headline,
          subhead: slide.overlays[currentLocale].subhead,
        }));
        const overflowingSlides = overflowStatus.filter(s => s.overflow);
        return {
          locale: currentLocale,
          overflowingSlides,
          totalSlides: slides.length,
          message: overflowingSlides.length > 0 
            ? `${overflowingSlides.length} slide(s) have overflow in ${currentLocale}`
            : `No overflow in ${currentLocale}`,
        };
      },
      abortSignal: controller.signal,
    };

    const rewriteOverlay = {
      name: "rewrite_overlay",
      description: "Rewrite headline and/or subhead for a specific slide with an instruction. Does not affect locked slides.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slide: {
            type: "number",
            description: "Slide ID (1-5)",
          },
          instruction: {
            type: "string",
            description: "Instruction for rewriting (e.g., 'make it shorter', 'fix overflow')",
          },
        },
        required: ["slide", "instruction"],
      },
      execute: async (params: Record<string, unknown>) => {
        const slideId = params.slide as number;
        const instruction = params.instruction as string;

        const slide = slides.find(s => s.id === slideId);
        if (!slide) {
          return { success: false, error: "Slide not found" };
        }

        if (slide.locked) {
          return {
            success: false,
            error: `Slide ${slideId} is locked and cannot be rewritten`,
            locked: true,
          };
        }

        const currentOverlay = slide.overlays[currentLocale];
        let newHeadline = currentOverlay.headline;
        let newSubhead = currentOverlay.subhead;

        if (instruction.toLowerCase().includes("shorter") || instruction.toLowerCase().includes("overflow")) {
          newHeadline = newHeadline.split(" ").slice(0, Math.ceil(newHeadline.split(" ").length * 0.6)).join(" ");
          newSubhead = newSubhead.split(" ").slice(0, Math.ceil(newSubhead.split(" ").length * 0.6)).join(" ");
        }

        setSlides(prev => prev.map(s => {
          if (s.id === slideId) {
            const updated = { ...s };
            updated.overlays[currentLocale] = {
              headline: newHeadline,
              subhead: newSubhead,
            };
            updated.overflow[currentLocale] = false;
            return updated;
          }
          return s;
        }));

        return {
          success: true,
          slideId,
          instruction,
          oldHeadline: currentOverlay.headline,
          oldSubhead: currentOverlay.subhead,
          newHeadline,
          newSubhead,
          diff: `Rewrote slide ${slideId}: shortened text to fix overflow`,
        };
      },
      abortSignal: controller.signal,
    };

    const applyLocalePass = {
      name: "apply_locale_pass",
      description: "Rewrite all unlocked overflowing slides for a specific locale",
      inputSchema: {
        type: "object" as const,
        properties: {
          locale: {
            type: "string",
            enum: ["en", "de", "es", "ja"],
            description: "Target locale code",
          },
        },
        required: ["locale"],
      },
      execute: async (params: Record<string, unknown>) => {
        const locale = params.locale as Locale;
        if (!["en", "de", "es", "ja"].includes(locale)) {
          return { success: false, error: "Invalid locale" };
        }

        const overflowingSlides = slides.filter(
          s => s.overflow[locale] && !s.locked
        );

        if (overflowingSlides.length === 0) {
          return {
            success: true,
            locale,
            fixedCount: 0,
            message: "No overflowing unlocked slides to fix",
          };
        }

        setSlides(prev => prev.map(slide => {
          if (slide.overflow[locale] && !slide.locked) {
            const updated = { ...slide };
            const currentOverlay = slide.overlays[locale];
            updated.overlays[locale] = {
              headline: currentOverlay.headline.split(" ").slice(0, Math.ceil(currentOverlay.headline.split(" ").length * 0.6)).join(" "),
              subhead: currentOverlay.subhead.split(" ").slice(0, Math.ceil(currentOverlay.subhead.split(" ").length * 0.6)).join(" "),
            };
            updated.overflow[locale] = false;
            return updated;
          }
          return slide;
        }));

        return {
          success: true,
          locale,
          fixedCount: overflowingSlides.length,
          fixedSlides: overflowingSlides.map(s => s.id),
          message: `Fixed ${overflowingSlides.length} overflowing slide(s) in ${locale}`,
        };
      },
      abortSignal: controller.signal,
    };

    const commentOnSlide = {
      name: "comment_on_slide",
      description: "Add a comment to a specific slide that will be visible to the human",
      inputSchema: {
        type: "object" as const,
        properties: {
          slide: {
            type: "number",
            description: "Slide ID (1-5)",
          },
          text: {
            type: "string",
            description: "Comment text",
          },
        },
        required: ["slide", "text"],
      },
      execute: async (params: Record<string, unknown>) => {
        const slideId = params.slide as number;
        const text = params.text as string;

        const slide = slides.find(s => s.id === slideId);
        if (!slide) {
          return { success: false, error: "Slide not found" };
        }

        setSlides(prev => prev.map(s => {
          if (s.id === slideId) {
            return {
              ...s,
              comments: [...s.comments, text],
            };
          }
          return s;
        }));

        return {
          success: true,
          slideId,
          comment: text,
          message: `Added comment to slide ${slideId}`,
        };
      },
      abortSignal: controller.signal,
    };

    const exportZipTool = {
      name: "export_zip",
      description: "Export the current locale's slides as a ZIP of 1320x2868 PNG files (no alpha channel, sRGB)",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      execute: async () => {
        try {
          await exportZip(slides, currentLocale);
          return {
            success: true,
            locale: currentLocale,
            fileCount: slides.length,
            dimensions: "1320x2868",
            format: "PNG (no alpha, sRGB)",
            filenames: slides.map(s => `habit-slide-${s.id}-${currentLocale}.png`),
            message: `Exported ${slides.length} PNG files for ${currentLocale}`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Export failed",
          };
        }
      },
      abortSignal: controller.signal,
    };

    try {
      modelContext.registerTool(getPageState);
      modelContext.registerTool(setLocale);
      modelContext.registerTool(setOverlay);
      modelContext.registerTool(checkOverflow);
      modelContext.registerTool(rewriteOverlay);
      modelContext.registerTool(applyLocalePass);
      modelContext.registerTool(commentOnSlide);
      modelContext.registerTool(exportZipTool);
      console.log("WebMCP tools registered successfully");
    } catch (error) {
      console.error("Failed to register WebMCP tools:", error);
    }

    return () => {
      controller.abort();
    };
  }, [slides, currentLocale]);

  const toggleLock = (slideId: number) => {
    setSlides(prev =>
      prev.map(s => (s.id === slideId ? { ...s, locked: !s.locked } : s))
    );
  };

  const handleExport = async () => {
    await exportZip(slides, currentLocale);
  };

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
                  webMcpEnabled ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className="text-gray-600">
                {webMcpEnabled ? "WebMCP Active" : "WebMCP Not Detected"}
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
