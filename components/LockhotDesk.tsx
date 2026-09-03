"use client";

import { useEffect, useState, useRef } from "react";
import { Locale, SlideData, Project, TemplateId } from "@/lib/types";
import { exportZip } from "@/lib/export";
import { registerWebMCPTools, getWebMCPState } from "@/lib/webmcp";
import {
  loadProjects,
  saveProject,
  loadCurrentProjectId,
  saveCurrentProjectId,
  createProject,
} from "@/lib/storage";
import { saveImage } from "@/lib/imageStorage";
import { measureOverflow } from "@/lib/overflow";
import SlideCard from "./SlideCard";

let registrationStarted = false;

const COMMON_LOCALES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pt-BR", name: "Português (BR)", flag: "🇧🇷" },
  { code: "zh-Hans", name: "简体中文", flag: "🇨🇳" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "full_bleed_caption_bottom", name: "Perfect", description: "Organic two-tone palette with centered phone frame" },
  { id: "caption_top", name: "Growth", description: "Warm cream campaign energy, title over thin-bezel phone" },
  { id: "framed_on_gradient", name: "Bold", description: "Dark navy with lavender accents" },
];

export default function LockhotDesk() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const [locales, setLocales] = useState<Locale[]>(["en"]);
  const [webMcpState, setWebMcpState] = useState({ enabled: false, error: null as string | null });
  const [showAddLocale, setShowAddLocale] = useState(false);
  const [newLocaleCode, setNewLocaleCode] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [copyToast, setCopyToast] = useState("");
  const [alertBanner, setAlertBanner] = useState<{ type: 'write-headlines' | 'generate-campaign'; visible: boolean } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slidesRef = useRef(slides);
  const currentLocaleRef = useRef(currentLocale);
  const projectRef = useRef(currentProject);
  const localesRef = useRef(locales);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    currentLocaleRef.current = currentLocale;
  }, [currentLocale]);

  useEffect(() => {
    projectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    localesRef.current = locales;
  }, [locales]);

  useEffect(() => {
    const projectId = loadCurrentProjectId();
    if (projectId) {
      const projects = loadProjects();
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
        setSlides(project.slides);
        setLocales(project.locales);
        setCurrentLocale(project.locales[0] || "en");
        setShowEmptyState(false);
      }
    }
  }, []);

  useEffect(() => {
    if (currentProject) {
      saveProject(currentProject);
    }
  }, [currentProject]);

  const handleFilesUpload = async (files: File[]) => {
    const imageFiles = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 5);

    if (imageFiles.length === 0) return;

    const newSlides = await Promise.all(
      imageFiles.map(async (file, index) => {
        const imageKey = `img-${Date.now()}-${index}`;
        await saveImage(imageKey, file);

        return {
          id: index + 1,
          templateId: "full_bleed_caption_bottom" as TemplateId,
          backgroundImage: '',
          imageKey,
          overlays: { en: { headline: '', subhead: '' } },
          locked: false,
          comments: [],
          overflow: { en: false },
          kind: "product" as const,
        };
      })
    );

    const project = createProject('My App', '', newSlides, ['en']);
    setCurrentProject(project);
    setSlides(newSlides);
    setLocales(['en']);
    setCurrentLocale('en');
    saveProject(project);
    saveCurrentProjectId(project.id);
    setShowEmptyState(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesUpload(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesUpload(Array.from(e.target.files));
    }
  };

  const handleAddLocale = (locale: Locale) => {
    if (locales.includes(locale)) return;

    const updatedLocales = [...locales, locale];
    setLocales(updatedLocales);

    const updatedSlides = slides.map(slide => {
      return {
        ...slide,
        overlays: {
          ...slide.overlays,
          [locale]: { headline: '', subhead: '' },
        },
        overflow: {
          ...slide.overflow,
          [locale]: false,
        },
      };
    });

    setSlides(updatedSlides);

    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        locales: updatedLocales,
        slides: updatedSlides,
      };
      setCurrentProject(updatedProject);
      saveProject(updatedProject);
    }

    setCurrentLocale(locale);
    setShowAddLocale(false);
    setNewLocaleCode('');
  };

  const handleSetTemplate = (template: TemplateId, slideId?: number) => {
    setSlides(prev => {
      let updated = prev.map(s => {
        if (slideId && s.id !== slideId) return s;
        if (!slideId && s.locked) return s;
        
        // Update templateId and remeasure overflow for all locales
        const updatedSlide = { ...s, templateId: template };
        const newOverflow: Record<string, boolean> = {};
        
        Object.keys(s.overlays).forEach(locale => {
          const overlay = s.overlays[locale];
          newOverflow[locale] = measureOverflow(overlay, template);
        });
        
        updatedSlide.overflow = newOverflow;
        return updatedSlide;
      });
      
      // Handle campaign slide for Growth template
      if (template === "caption_top" && !slideId) {
        // Add empty campaign slide if it doesn't exist
        const hasCampaign = updated.some(s => s.kind === "campaign");
        if (!hasCampaign) {
          const campaignSlide: SlideData = {
            id: 0,
            templateId: "caption_top",
            backgroundImage: '',
            overlays: { en: { headline: 'focus plan thrive', subhead: 'Less distraction. More direction.' } },
            locked: false,
            comments: [],
            overflow: { en: false },
            kind: "campaign",
          };
          // Add campaign slide at the start, renumber existing slides
          updated = [campaignSlide, ...updated.map((s, i) => ({ ...s, id: i + 1 }))];
        }
      } else if (template !== "caption_top" && !slideId) {
        // Remove empty campaign slide when switching away from Growth
        updated = updated.filter(s => {
          if (s.kind === "campaign" && !s.imageKey && !s.backgroundImage) {
            return false;
          }
          return true;
        });
      }
      
      if (currentProject) {
        const updatedProject = { ...currentProject, slides: updated };
        setCurrentProject(updatedProject);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (registrationStarted) {
      setWebMcpState(getWebMCPState());
      return;
    }

    registrationStarted = true;

    registerWebMCPTools(
      () => slidesRef.current,
      () => currentLocaleRef.current,
      () => projectRef.current,
      () => localesRef.current,
      (updater) => {
        setSlides(prev => {
          const updated = updater(prev);
          if (currentProject) {
            const updatedProject = { ...currentProject, slides: updated };
            setCurrentProject(updatedProject);
          }
          return updated;
        });
      },
      (locale) => {
        setCurrentLocale(locale);
      },
      (locale) => {
        handleAddLocale(locale);
      },
      handleSetTemplate,
      handleStartOver,
      (slides, locale, projectName) => exportZip(slides, locale, projectName)
    ).then(() => {
      setWebMcpState(getWebMCPState());
    });
  }, [currentProject]);

  const toggleLock = (slideId: number) => {
    setSlides(prev => {
      const updated = prev.map(s => (s.id === slideId ? { ...s, locked: !s.locked } : s));
      if (currentProject) {
        const updatedProject = { ...currentProject, slides: updated };
        setCurrentProject(updatedProject);
      }
      return updated;
    });
  };

  const handleExport = async () => {
    await exportZip(slides, currentLocale, currentProject?.name || 'lockshot');
  };

  const handleFileUpload = async (slideId: number, file: File) => {
    const imageKey = `img-${Date.now()}-${slideId}`;
    await saveImage(imageKey, file);
    
    setSlides(prev => {
      const updated = prev.map(s => {
        if (s.id === slideId) {
          return { ...s, imageKey, backgroundImage: '' };
        }
        return s;
      });
      if (currentProject) {
        const updatedProject = { ...currentProject, slides: updated };
        setCurrentProject(updatedProject);
      }
      return updated;
    });
  };

  const handleCampaignUpload = async (file: File) => {
    const imageKey = `campaign-${Date.now()}`;
    await saveImage(imageKey, file);
    
    setSlides(prev => {
      const updated = prev.map(s => {
        if (s.kind === "campaign") {
          return { ...s, imageKey, backgroundImage: '' };
        }
        return s;
      });
      if (currentProject) {
        const updatedProject = { ...currentProject, slides: updated };
        setCurrentProject(updatedProject);
      }
      return updated;
    });
  };

  const handleColorChange = (slideId: number, colors: { text?: string; background?: string; accent?: string }) => {
    setSlides(prev => {
      const updated = prev.map(s => {
        if (s.id === slideId) {
          return { ...s, colors };
        }
        return s;
      });
      if (currentProject) {
        const updatedProject = { ...currentProject, slides: updated };
        setCurrentProject(updatedProject);
      }
      return updated;
    });
  };

  const handleOverlayChange = (slideId: number, headline: string, subhead: string) => {
    setSlides(prev => {
      const updated = prev.map(s => {
        if (s.id === slideId) {
          return {
            ...s,
            overlays: {
              ...s.overlays,
              [currentLocale]: {
                headline,
                subhead,
                author: 'user' as const,
              },
            },
          };
        }
        return s;
      });
      if (currentProject) {
        const updatedProject = { ...currentProject, slides: updated };
        setCurrentProject(updatedProject);
      }
      return updated;
    });
  };

  const handleStartOver = () => {
    setCurrentProject(null);
    setSlides([]);
    setLocales(['en']);
    setCurrentLocale('en');
    saveCurrentProjectId(null);
    setShowEmptyState(true);
  };

  const handleReplaceScreenshots = async (files: File[]) => {
    await handleFilesUpload(files);
  };

  const handleWriteHeadlines = async () => {
    const hasGrowth = slides.some(s => s.templateId === "caption_top");
    const hasCampaign = slides.some(s => s.kind === "campaign");
    const campaignEmpty = hasCampaign && !slides.find(s => s.kind === "campaign")?.imageKey;
    
    let prompt = "Use the site tools. Look at the slides and write a headline and subhead for each.";
    
    if (hasGrowth && campaignEmpty) {
      prompt += "\n\nIMPORTANT: This project uses the Growth template with an optional campaign slide. The campaign slide needs a designed graphic with typography. You can generate one later with the 'Generate campaign photo' button, which will create a finished 9:16 marketing image with the campaign overlay text rendered into it.";
    }
    
    // Try 1: ChatGPT Apps sendFollowUpMessage
    if (typeof window !== 'undefined' && (window as any).openai?.sendFollowUpMessage) {
      try {
        await (window as any).openai.sendFollowUpMessage({ prompt });
        setAlertBanner({ type: 'write-headlines', visible: true });
        setTimeout(() => setAlertBanner(null), 10000);
        return;
      } catch (e) {
        console.log("sendFollowUpMessage failed, trying postMessage");
      }
    }
    
    // Try 2: MCP Apps ui/message postMessage
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        window.parent.postMessage({
          jsonrpc: "2.0",
          method: "ui/message",
          params: {
            role: "user",
            content: [{ type: "text", text: prompt }]
          }
        }, "*");
        setAlertBanner({ type: 'write-headlines', visible: true });
        setTimeout(() => setAlertBanner(null), 10000);
        return;
      } catch (e) {
        console.log("postMessage failed, falling back to clipboard");
      }
    }
    
    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(prompt);
      setAlertBanner({ type: 'write-headlines', visible: true });
      setTimeout(() => setAlertBanner(null), 10000);
    } catch (e) {
      setCopyToast("Failed to copy");
      setTimeout(() => setCopyToast(""), 3000);
    }
  };

  const handleGenerateCampaignPhoto = async () => {
    // Seed campaign overlay if empty
    const campaignSlide = slides.find(s => s.kind === "campaign");
    let headlineText = 'focus plan thrive';
    let subheadText = 'Less distraction. More direction.';
    
    if (campaignSlide) {
      const overlay = campaignSlide.overlays[currentLocale];
      if (!overlay || (!overlay.headline && !overlay.subhead)) {
        // Set default overlay for current locale
        setSlides(prev => prev.map(s => {
          if (s.kind === "campaign") {
            return {
              ...s,
              overlays: {
                ...s.overlays,
                [currentLocale]: {
                  headline: currentLocale === 'en' ? 'focus plan thrive' : 'focus plan thrive',
                  subhead: currentLocale === 'en' ? 'Less distraction. More direction.' : 'Less distraction. More direction.',
                }
              }
            };
          }
          return s;
        }));
        
        if (currentProject) {
          const updatedSlides = slides.map(s => {
            if (s.kind === "campaign") {
              return {
                ...s,
                overlays: {
                  ...s.overlays,
                  [currentLocale]: {
                    headline: currentLocale === 'en' ? 'focus plan thrive' : 'focus plan thrive',
                    subhead: currentLocale === 'en' ? 'Less distraction. More direction.' : 'Less distraction. More direction.',
                  }
                }
              };
            }
            return s;
          });
          const updatedProject = { ...currentProject, slides: updatedSlides };
          setCurrentProject(updatedProject);
        }
      } else {
        // Use existing overlay text
        headlineText = overlay.headline || headlineText;
        subheadText = overlay.subhead || subheadText;
      }
    }
    
    const prompt = `Use the site tools. First, check get_page_state to see the campaign slide overlay. If the campaign slide (id=0) has empty overlay text, use set_overlay to set: headline='focus plan thrive' (three lowercase words), subhead='Less distraction. More direction.' (short tagline) for the current locale.\n\nThen generate a vertical (9:16 aspect ratio) designed campaign graphic WITH typography included. This is a finished marketing image, not a text-free photo.\n\nCOPY TO RENDER IN THE IMAGE:\nHeadline: "${headlineText}"\nSubhead: "${subheadText}"\n\nLAYOUT: Split vertical layout — left ~40% is a cream/beige negative space column containing the stacked headline words and subhead. Right ~60% shows a lifestyle portrait/subject. The text must NOT overlap the person/photo — keep type confined to the left column.\n\nHEADLINE STYLING: If the headline is a short phrase (like "focus plan thrive"), stack each word on its own line in lowercase, using a bold condensed sans-serif. The last word should be in sage green with a terracotta hand-drawn squiggle underline. Earlier words in dark brown/charcoal.\n\nSUBHEAD STYLING: Place the subhead below the headline stack in a smaller serif or monospace font, dark brown/charcoal.\n\nPALETTE: Warm cream/beige background, sage green accent, terracotta accent, dark brown text. Organic, modern, minimalist.\n\nNO devices, NO phone UI, NO extra random words beyond the specified copy. The user will drop this finished graphic on the campaign slot. Because the type is baked into the image, Lockshot will NOT composite additional text on top.`;
    
    // Try sendFollowUpMessage
    if (typeof window !== 'undefined' && (window as any).openai?.sendFollowUpMessage) {
      try {
        await (window as any).openai.sendFollowUpMessage({ prompt });
        setAlertBanner({ type: 'generate-campaign', visible: true });
        setTimeout(() => setAlertBanner(null), 12000);
        return;
      } catch (e) {
        console.log("sendFollowUpMessage failed");
      }
    }
    
    // Try postMessage
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        window.parent.postMessage({
          jsonrpc: "2.0",
          method: "ui/message",
          params: {
            role: "user",
            content: [{ type: "text", text: prompt }]
          }
        }, "*");
        setAlertBanner({ type: 'generate-campaign', visible: true });
        setTimeout(() => setAlertBanner(null), 12000);
        return;
      } catch (e) {
        console.log("postMessage failed");
      }
    }
    
    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(prompt);
      setAlertBanner({ type: 'generate-campaign', visible: true });
      setTimeout(() => setAlertBanner(null), 12000);
    } catch (e) {
      setCopyToast("Failed to copy");
      setTimeout(() => setCopyToast(""), 3000);
    }
  };

  const statusText = webMcpState.error 
    ? `WebMCP Error: ${webMcpState.error}`
    : webMcpState.enabled 
      ? "WebMCP Active" 
      : "WebMCP Not Detected";

  if (showEmptyState) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-5xl font-bold text-ink mb-16 leading-tight">
            Ship the same app screens<br />in every language.
          </h1>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-surface border-2 border-dashed rounded-[22px] p-12 text-center cursor-pointer transition-all mb-8 ${
              isDragging
                ? "border-model bg-model-soft"
                : "border-line hover:border-model hover:bg-model-soft"
            }`}
          >
            <div className="text-6xl mb-4">📸</div>
            <p className="text-lg font-semibold text-ink mb-2">
              Drop screenshots here
            </p>
            <p className="text-sm text-ink-2">
              Or click to select images
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-surface border border-line rounded-[14px] shadow-card text-sm">
              <span className="text-ink-2">Copy is written by ·</span>
              <span className="font-semibold text-ink">ChatGPT</span>
              <span className="text-ink-2">, over MCP</span>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${webMcpState.enabled ? "bg-live" : "bg-ink-3"}`} />
            </div>
          </div>

          <ul className="space-y-3 text-[15px] text-ink-2">
            <li className="flex items-start gap-3">
              <span className="text-model font-bold">→</span>
              <span>Pick a template (Perfect / Growth / Bold)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-model font-bold">→</span>
              <span>Add locales — ChatGPT writes them via MCP tools</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-model font-bold">→</span>
              <span>Export size: <span className="font-semibold text-ink">1320 × 2868</span> pixels per frame</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Lockshot</h1>
              <p className="text-sm text-ink-3 mt-0.5">
                App Store Screenshot Localization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-[14px] text-sm">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${webMcpState.enabled ? "bg-live shadow-[0_0_0_3px_rgba(27,158,95,0.15)]" : "bg-ink-3"}`} />
                <span className="text-ink-2">{statusText}</span>
              </div>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-transparent border border-line text-ink-2 rounded-[14px] hover:bg-line-soft transition-colors font-medium text-sm"
              >
                Start over
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-ink text-surface rounded-[14px] hover:bg-black transition-colors font-medium text-sm"
              >
                Export set
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="space-y-4">
          {/* Alert Banner */}
          {alertBanner?.visible && (
            <div 
              className="relative bg-surface border-2 border-model px-6 py-4 rounded-[14px] shadow-card flex items-start gap-4"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex-shrink-0 text-2xl">
                {alertBanner.type === 'write-headlines' ? '✏️' : '🖼️'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-base text-ink mb-1">
                  {alertBanner.type === 'write-headlines' 
                    ? 'Copied — paste it in the ChatGPT chat' 
                    : 'Copied — paste it in the ChatGPT chat'}
                </div>
                <div className="text-sm text-ink-2">
                  {alertBanner.type === 'write-headlines'
                    ? 'ChatGPT will write overlay text for your slides using the site tools.'
                    : 'ChatGPT will generate a finished campaign graphic with designed typography baked in. Drop it on the campaign slot below (not Replace Screenshots).'}
                </div>
              </div>
              <button
                onClick={() => setAlertBanner(null)}
                className="flex-shrink-0 text-ink-2 hover:text-ink text-xl font-bold"
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[11px] text-ink-3 px-1">Template</label>
            <div className="inline-flex bg-surface border border-line rounded-[14px] p-1 gap-1">
              {TEMPLATES.map(template => {
              // Determine active template (most common among slides)
              const templateCounts = slides.reduce((acc, slide) => {
                acc[slide.templateId] = (acc[slide.templateId] || 0) + 1;
                return acc;
              }, {} as Record<TemplateId, number>);
              
              const mostCommonTemplate = Object.entries(templateCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
              const isActive = mostCommonTemplate === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleSetTemplate(template.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-[9px] transition-colors ${
                    isActive 
                      ? 'bg-ink text-surface' 
                      : 'text-ink-2 hover:bg-line-soft'
                  }`}
                  title={template.description}
                >
                  {template.name}
                </button>
              );
            })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-ink-3 px-1">Locale</label>
            <div className="flex items-center gap-3 flex-wrap">
              {locales.map((locale) => {
              const localeInfo = COMMON_LOCALES.find(l => l.code === locale);
              return (
                <button
                  key={locale}
                  onClick={() => setCurrentLocale(locale)}
                  className={`inline-flex items-center gap-2 px-3 py-2 bg-surface border rounded-[14px] font-jetbrains text-sm font-medium transition-colors ${
                    currentLocale === locale
                      ? 'border-ink text-ink'
                      : 'border-line text-ink-2 hover:bg-line-soft'
                  }`}
                >
                  <span>{localeInfo?.flag || '🌐'}</span>
                  <span>{locale}</span>
                  {locales.length > 1 && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedLocales = locales.filter(l => l !== locale);
                        setLocales(updatedLocales);
                        if (currentLocale === locale) {
                          setCurrentLocale(updatedLocales[0] || 'en');
                        }
                      }}
                      className="text-ink-3 hover:text-ink text-base leading-none cursor-pointer"
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}
            
            {showAddLocale ? (
              <>
                <select
                  value={newLocaleCode}
                  onChange={(e) => setNewLocaleCode(e.target.value)}
                  className="px-3 py-2 bg-surface border border-line rounded-[14px] text-sm font-jetbrains text-ink-2 focus:outline-none focus:border-model"
                >
                  <option value="">Select locale...</option>
                  {COMMON_LOCALES.filter(l => !locales.includes(l.code)).map(locale => (
                    <option key={locale.code} value={locale.code}>
                      {locale.flag} {locale.code} — {locale.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => newLocaleCode && handleAddLocale(newLocaleCode)}
                  disabled={!newLocaleCode}
                  className="px-3 py-2 bg-ink text-surface rounded-[14px] hover:bg-black transition-colors text-sm font-medium disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddLocale(false);
                    setNewLocaleCode('');
                  }}
                  className="px-3 py-2 bg-transparent border border-line text-ink-2 rounded-[14px] hover:bg-line-soft transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAddLocale(true)}
                className="px-3 py-2 bg-transparent border-2 border-dashed border-line text-ink-2 rounded-[14px] hover:bg-line-soft hover:border-ink-2 transition-colors text-sm font-medium"
              >
                + Add locale
              </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleWriteHeadlines}
              className="px-4 py-2 text-white rounded-[14px] transition-colors font-medium text-sm"
              style={{ backgroundColor: '#0F7FD8' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0A5FAF'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0F7FD8'}
            >
              ✏️ Write headlines
            </button>

            {slides.some(s => s.kind === "campaign" && !s.imageKey) && (
              <button
                onClick={handleGenerateCampaignPhoto}
                className="px-4 py-2 text-white rounded-[14px] transition-colors font-medium text-sm"
                style={{ backgroundColor: '#0F7FD8' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0A5FAF'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0F7FD8'}
                title="Generate a designed campaign graphic with typography baked in"
              >
                🖼️ Generate campaign photo
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-transparent border border-line text-ink-2 rounded-[9px] hover:bg-line-soft transition-colors text-sm"
            >
              Replace screenshots
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  handleReplaceScreenshots(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Tray with horizontal scroll */}
      <div className="bg-tray rounded-[22px] p-6 shadow-[inset_0_1px_3px_rgba(25,26,28,0.08)] overflow-x-auto">
        <div className="flex gap-6" style={{ minWidth: '380px' }}>
          {/* Product Slides */}
          {slides.filter(s => s.kind !== "campaign").map((slide) => (
            <div key={slide.id} className="flex-shrink-0 w-[min(340px,90vw)]">
              <SlideCard
                slide={slide}
                currentLocale={currentLocale}
                onToggleLock={toggleLock}
                onFileUpload={(file) => handleFileUpload(slide.id, file)}
                onColorChange={handleColorChange}
                onOverlayChange={handleOverlayChange}
              />
            </div>
          ))}
          
          {/* Campaign Cell for Growth template */}
          {slides.some(s => s.templateId === "caption_top") && (() => {
            const campaignSlide = slides.find(s => s.kind === "campaign");
            if (!campaignSlide) return null;
            
            if (!campaignSlide.imageKey && !campaignSlide.backgroundImage) {
              return (
                <div
                  key="campaign"
                  className="flex-shrink-0 w-[min(340px,90vw)]"
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      handleCampaignUpload(file);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleCampaignUpload(file);
                    };
                    input.click();
                  }}
                >
                  <div 
                    className="bg-transparent border-2 border-dashed border-line rounded-[22px] flex items-center justify-center text-ink-3 text-sm cursor-pointer hover:border-model hover:bg-model-soft transition-all"
                    style={{ aspectRatio: '1320 / 2868' }}
                  >
                    + Campaign photo
                  </div>
                </div>
              );
            }
            
            return (
              <div key="campaign" className="flex-shrink-0 w-[min(340px,90vw)]">
                <SlideCard
                  slide={campaignSlide}
                  currentLocale={currentLocale}
                  onToggleLock={toggleLock}
                  onFileUpload={handleCampaignUpload}
                  onColorChange={handleColorChange}
                  onOverlayChange={handleOverlayChange}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
