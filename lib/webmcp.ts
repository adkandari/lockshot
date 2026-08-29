import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import type { Locale, SlideData } from './types';

declare global {
  interface Document {
    modelContext?: {
      registerTool(
        tool: {
          name: string;
          description: string;
          inputSchema: {
            type: "object";
            properties: Record<string, unknown>;
            required?: string[];
            additionalProperties: boolean;
          };
          annotations?: {
            readOnlyHint?: boolean;
          };
          execute: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
        },
        options?: { signal?: AbortSignal }
      ): Promise<void>;
    };
  }
}

initializeWebMCPPolyfill();

interface RegistrationState {
  registered: boolean;
  error: string | null;
  controller: AbortController | null;
}

const state: RegistrationState = {
  registered: false,
  error: null,
  controller: null,
};

export function getWebMCPState() {
  return {
    enabled: state.registered && !state.error,
    error: state.error,
  };
}

export async function registerWebMCPTools(
  getSlidesRef: () => SlideData[],
  getCurrentLocaleRef: () => Locale,
  setSlides: (updater: (prev: SlideData[]) => SlideData[]) => void,
  setCurrentLocale: (locale: Locale) => void,
  exportZip: (slides: SlideData[], locale: Locale) => Promise<void>
) {
  if (state.registered) {
    return;
  }

  if (typeof document === 'undefined' || !document.modelContext?.registerTool) {
    state.error = 'document.modelContext not available after polyfill init';
    return;
  }

  const controller = new AbortController();
  state.controller = controller;

  const tools = [
    {
      name: "get_page_state",
      description: "Get the current page state including locale, all slide overlays, locked status, overflow flags, and comments",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async () => {
        const locale = getCurrentLocaleRef();
        const currentSlides = getSlidesRef();
        return {
          currentLocale: locale,
          slides: currentSlides.map(slide => ({
            id: slide.id,
            headline: slide.overlays[locale].headline,
            subhead: slide.overlays[locale].subhead,
            locked: slide.locked,
            overflow: slide.overflow[locale],
            comments: slide.comments,
          })),
        };
      },
    },
    {
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
        additionalProperties: false,
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
    },
    {
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
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const slideId = params.slide as number;
        const headline = params.headline as string | undefined;
        const subhead = params.subhead as string | undefined;

        const locale = getCurrentLocaleRef();
        const currentSlides = getSlidesRef();
        const slide = currentSlides.find(s => s.id === slideId);
        
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
              updated.overlays[locale] = {
                ...updated.overlays[locale],
                headline,
              };
            }
            if (subhead !== undefined) {
              updated.overlays[locale] = {
                ...updated.overlays[locale],
                subhead,
              };
            }
            return updated;
          }
          return s;
        }));

        return {
          success: true,
          slideId,
          newHeadline: headline || slide.overlays[locale].headline,
          newSubhead: subhead || slide.overlays[locale].subhead,
          diff: `Updated slide ${slideId} ${headline ? 'headline' : ''} ${subhead ? 'subhead' : ''}`.trim(),
        };
      },
    },
    {
      name: "check_overflow",
      description: "Check overflow status for all slides in the current locale",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: async () => {
        const locale = getCurrentLocaleRef();
        const currentSlides = getSlidesRef();
        const overflowStatus = currentSlides.map(slide => ({
          slideId: slide.id,
          overflow: slide.overflow[locale],
          headline: slide.overlays[locale].headline,
          subhead: slide.overlays[locale].subhead,
        }));
        const overflowingSlides = overflowStatus.filter(s => s.overflow);
        return {
          locale,
          overflowingSlides,
          totalSlides: currentSlides.length,
          message: overflowingSlides.length > 0 
            ? `${overflowingSlides.length} slide(s) have overflow in ${locale}`
            : `No overflow in ${locale}`,
        };
      },
    },
    {
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
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const slideId = params.slide as number;
        const instruction = params.instruction as string;

        const locale = getCurrentLocaleRef();
        const currentSlides = getSlidesRef();
        const slide = currentSlides.find(s => s.id === slideId);
        
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

        const currentOverlay = slide.overlays[locale];
        let newHeadline = currentOverlay.headline;
        let newSubhead = currentOverlay.subhead;

        if (instruction.toLowerCase().includes("shorter") || instruction.toLowerCase().includes("overflow")) {
          const targetHeadlineLength = locale === "de" ? 4 : 5;
          const targetSubheadLength = locale === "de" ? 4 : 5;
          
          const headlineWords = newHeadline.split(" ");
          const subheadWords = newSubhead.split(" ");
          
          if (headlineWords.length > targetHeadlineLength) {
            newHeadline = headlineWords.slice(0, targetHeadlineLength).join(" ");
          }
          
          if (subheadWords.length > targetSubheadLength) {
            newSubhead = subheadWords.slice(0, targetSubheadLength).join(" ");
          }
        }

        setSlides(prev => prev.map(s => {
          if (s.id === slideId) {
            const updated = { ...s };
            updated.overlays[locale] = {
              headline: newHeadline,
              subhead: newSubhead,
            };
            updated.overflow[locale] = false;
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
          diff: `Rewrote slide ${slideId}: "${currentOverlay.headline}" → "${newHeadline}" | "${currentOverlay.subhead}" → "${newSubhead}"`,
        };
      },
    },
    {
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
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const locale = params.locale as Locale;
        if (!["en", "de", "es", "ja"].includes(locale)) {
          return { success: false, error: "Invalid locale" };
        }

        const currentSlides = getSlidesRef();
        const overflowingSlides = currentSlides.filter(
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

        const targetLength = locale === "de" ? 4 : 5;

        setSlides(prev => prev.map(slide => {
          if (slide.overflow[locale] && !slide.locked) {
            const updated = { ...slide };
            const currentOverlay = slide.overlays[locale];
            const headlineWords = currentOverlay.headline.split(" ");
            const subheadWords = currentOverlay.subhead.split(" ");
            
            updated.overlays[locale] = {
              headline: headlineWords.length > targetLength 
                ? headlineWords.slice(0, targetLength).join(" ")
                : currentOverlay.headline,
              subhead: subheadWords.length > targetLength
                ? subheadWords.slice(0, targetLength).join(" ")
                : currentOverlay.subhead,
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
    },
    {
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
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const slideId = params.slide as number;
        const text = params.text as string;

        const currentSlides = getSlidesRef();
        const slide = currentSlides.find(s => s.id === slideId);
        
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
    },
    {
      name: "export_zip",
      description: "Export the current locale's slides as a ZIP of 1320x2868 PNG files (no alpha channel, sRGB)",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        try {
          const locale = getCurrentLocaleRef();
          const currentSlides = getSlidesRef();
          await exportZip(currentSlides, locale);
          return {
            success: true,
            locale,
            fileCount: currentSlides.length,
            dimensions: "1320x2868",
            format: "PNG (no alpha, sRGB)",
            filenames: currentSlides.map(s => `habit-slide-${s.id}-${locale}.png`),
            message: `Exported ${currentSlides.length} PNG files for ${locale}`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Export failed",
          };
        }
      },
    },
  ];

  try {
    for (const tool of tools) {
      await document.modelContext.registerTool(tool, { signal: controller.signal });
    }
    state.registered = true;
    console.log("WebMCP tools registered successfully");
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Registration failed";
    console.error("Failed to register WebMCP tools:", error);
  }
}
