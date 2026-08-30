import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import type { Locale, SlideData, Project, TemplateId } from './types';
import { measureOverflow } from './overflow';

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
  getProjectRef: () => Project | null,
  getLocalesRef: () => Locale[],
  setSlides: (updater: (prev: SlideData[]) => SlideData[]) => void,
  setCurrentLocale: (locale: Locale) => void,
  addLocale: (locale: Locale) => void,
  setTemplate: (template: TemplateId, slideId?: number) => void,
  resetProject: () => void,
  exportZip: (slides: SlideData[], locale: Locale, projectName: string) => Promise<void>
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
      description: "Get the current page state including project info, locale, all slide overlays, locked status, overflow flags, and comments",
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
        const project = getProjectRef();
        const locales = getLocalesRef();
        
        const hasEmptyOverlays = currentSlides.some(slide => {
          const overlay = slide.overlays[locale];
          return !overlay || (!overlay.headline && !overlay.subhead);
        });
        
        return {
          project: project ? {
            id: project.id,
            name: project.name,
            storeUrl: project.storeUrl,
          } : null,
          currentLocale: locale,
          availableLocales: locales,
          overlays_empty: hasEmptyOverlays,
          hint: hasEmptyOverlays ? "Overlays are empty — write headline and subhead per slide with set_overlay" : undefined,
          slides: currentSlides.map(slide => ({
            id: slide.id,
            headline: slide.overlays[locale]?.headline || '',
            subhead: slide.overlays[locale]?.subhead || '',
            locked: slide.locked,
            overflow: slide.overflow[locale] || false,
            comments: slide.comments,
            backgroundImage: slide.backgroundImage,
          })),
        };
      },
    },
    {
      name: "add_locale",
      description: "Add a new locale to the project. Use BCP 47 codes (e.g., en, de, es, ja, fr, pt-BR, zh-Hans). ChatGPT should then translate via set_overlay.",
      inputSchema: {
        type: "object" as const,
        properties: {
          locale: {
            type: "string",
            description: "BCP 47 locale code (e.g., de, es, ja, fr, pt-BR, zh-Hans)",
          },
        },
        required: ["locale"],
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const locale = params.locale as string;
        const locales = getLocalesRef();
        
        if (locales.includes(locale)) {
          return {
            success: false,
            error: `Locale ${locale} already exists`,
          };
        }
        
        const currentSlides = getSlidesRef();
        const enOverlays = currentSlides.map(s => s.overlays['en']);
        
        addLocale(locale);
        
        const slides = getSlidesRef();
        
        return {
          success: true,
          locale,
          availableLocales: getLocalesRef(),
          message: `Added locale ${locale}. This locale now shows English draft overlays. You MUST call set_overlay for each slide to translate the text. Call set_overlay(slide=1, headline="...", subhead="...") through set_overlay(slide=5, headline="...", subhead="...") with translated ${locale} text.`,
          slidesToTranslate: slides.map((s, i) => ({
            slideId: s.id,
            enHeadline: enOverlays[i]?.headline || '',
            enSubhead: enOverlays[i]?.subhead || '',
          })),
        };
      },
    },
    {
      name: "set_template",
      description: "Set the template for all unlocked slides or a specific slide. Templates: full_bleed_caption_bottom (default, screenshot fills frame with caption at bottom), caption_top (caption bar at top), framed_on_gradient (phone frame on gradient), gradient_only (gradient background only)",
      inputSchema: {
        type: "object" as const,
        properties: {
          template: {
            type: "string",
            enum: ["full_bleed_caption_bottom", "caption_top", "framed_on_gradient", "gradient_only"],
            description: "Template ID to apply",
          },
          slide: {
            type: "number",
            description: "Optional slide ID (1-5). If omitted, applies to all unlocked slides.",
          },
        },
        required: ["template"],
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const template = params.template as TemplateId;
        const slideId = params.slide as number | undefined;
        
        const currentSlides = getSlidesRef();
        
        if (slideId) {
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
        }
        
        setTemplate(template, slideId);
        
        const affectedSlides = slideId 
          ? [slideId]
          : currentSlides.filter(s => !s.locked).map(s => s.id);
        
        return {
          success: true,
          template,
          affectedSlides,
          message: slideId 
            ? `Set template ${template} on slide ${slideId}`
            : `Set template ${template} on ${affectedSlides.length} unlocked slide(s)`,
        };
      },
    },
    {
      name: "set_locale",
      description: "Switch to a different locale from available locales",
      inputSchema: {
        type: "object" as const,
        properties: {
          locale: {
            type: "string",
            description: "Target locale code from available locales",
          },
        },
        required: ["locale"],
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const locale = params.locale as Locale;
        const locales = getLocalesRef();
        
        if (!locales.includes(locale)) {
          return {
            success: false,
            error: `Invalid locale. Available locales: ${locales.join(', ')}`,
            availableLocales: locales,
          };
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
      description: "Set headline and/or subhead for a specific slide in the current locale. Does not affect locked slides. Overflow is automatically measured.",
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

        const newOverlay = {
          headline: headline !== undefined ? headline : slide.overlays[locale]?.headline || '',
          subhead: subhead !== undefined ? subhead : slide.overlays[locale]?.subhead || '',
        };

        const overflow = measureOverflow(newOverlay);

        setSlides(prev => prev.map(s => {
          if (s.id === slideId) {
            const updated = { ...s };
            updated.overlays[locale] = newOverlay;
            updated.overflow[locale] = overflow;
            return updated;
          }
          return s;
        }));

        return {
          success: true,
          slideId,
          locale,
          newHeadline: newOverlay.headline,
          newSubhead: newOverlay.subhead,
          overflow,
          diff: `Updated slide ${slideId} ${headline !== undefined ? 'headline' : ''} ${subhead !== undefined ? 'subhead' : ''}`.trim(),
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
          overflow: slide.overflow[locale] || false,
          headline: slide.overlays[locale]?.headline || '',
          subhead: slide.overlays[locale]?.subhead || '',
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
      description: "Rewrite headline and/or subhead for a specific slide with an instruction. Does not affect locked slides. ChatGPT should generate the new text based on the instruction.",
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

        const currentOverlay = slide.overlays[locale] || { headline: '', subhead: '' };
        
        return {
          success: false,
          error: "ChatGPT should generate the new text and call set_overlay directly",
          instruction,
          currentHeadline: currentOverlay.headline,
          currentSubhead: currentOverlay.subhead,
          message: `To rewrite slide ${slideId}, ChatGPT should generate new text based on "${instruction}" and call set_overlay(slide=${slideId}, headline="...", subhead="...")`,
        };
      },
    },
    {
      name: "apply_locale_pass",
      description: "Identify all unlocked overflowing slides for a specific locale. ChatGPT should then rewrite them via set_overlay.",
      inputSchema: {
        type: "object" as const,
        properties: {
          locale: {
            type: "string",
            description: "Target locale code",
          },
        },
        required: ["locale"],
        additionalProperties: false,
      },
      execute: async (params: Record<string, unknown>) => {
        const locale = params.locale as Locale;
        const locales = getLocalesRef();
        
        if (!locales.includes(locale)) {
          return {
            success: false,
            error: `Invalid locale. Available: ${locales.join(', ')}`,
          };
        }

        const currentSlides = getSlidesRef();
        const overflowingSlides = currentSlides.filter(
          s => (s.overflow[locale] || false) && !s.locked
        );

        if (overflowingSlides.length === 0) {
          return {
            success: true,
            locale,
            fixedCount: 0,
            message: "No overflowing unlocked slides to fix",
          };
        }

        return {
          success: false,
          locale,
          overflowingSlides: overflowingSlides.map(s => ({
            slideId: s.id,
            headline: s.overlays[locale]?.headline || '',
            subhead: s.overlays[locale]?.subhead || '',
            overflow: true,
          })),
          message: `Found ${overflowingSlides.length} overflowing slide(s) in ${locale}. ChatGPT should rewrite each via set_overlay.`,
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
      name: "reset_project",
      description: "Clear the current project and start over with a fresh empty state (equivalent to 'Start Over' button). Wipes localStorage, clears images, resets to empty drop zone.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        resetProject();
        return {
          success: true,
          message: "Project reset. Drop zone is ready for new screenshots.",
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
          const project = getProjectRef();
          const projectName = project?.name || 'lockshot';
          
          await exportZip(currentSlides, locale, projectName);
          return {
            success: true,
            locale,
            fileCount: currentSlides.length,
            dimensions: "1320x2868",
            format: "PNG (no alpha, sRGB)",
            filenames: currentSlides.map(s => `${projectName.toLowerCase().replace(/\s+/g, '-')}-slide-${s.id}-${locale}.png`),
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
