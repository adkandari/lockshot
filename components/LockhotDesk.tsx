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
  { id: "full_bleed_caption_bottom", name: "Full Bleed", description: "Screenshot fills frame, caption at bottom" },
  { id: "caption_top", name: "Caption Top", description: "Caption bar at top, screenshot below" },
  { id: "framed_on_gradient", name: "Framed", description: "Phone frame on gradient background" },
  { id: "gradient_only", name: "Gradient", description: "Gradient background only" },
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
      const enOverlay = slide.overlays['en'] || { headline: '', subhead: '' };
      return {
        ...slide,
        overlays: {
          ...slide.overlays,
          [locale]: { ...enOverlay },
        },
        overflow: {
          ...slide.overflow,
          [locale]: measureOverflow(enOverlay),
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
      const updated = prev.map(s => {
        if (slideId && s.id !== slideId) return s;
        if (!slideId && s.locked) return s;
        return { ...s, templateId: template };
      });
      
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

  const statusText = webMcpState.error 
    ? `WebMCP Error: ${webMcpState.error}`
    : webMcpState.enabled 
      ? "WebMCP Active" 
      : "WebMCP Not Detected";

  if (showEmptyState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Lockshot</h1>
            <p className="text-gray-600">App Store Screenshot Localization Desk</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
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

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Drop Screenshots Here
            </h2>
            <p className="text-gray-600 mb-4">
              Or click to select up to 5 PNG/JPG files
            </p>
            <p className="text-sm text-gray-500">
              Raw simulator or device screenshots work best
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

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>After uploading, pick a template and let ChatGPT write your copy in any locale</p>
          </div>
        </div>
      </div>
    );
  }

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
            <button
              onClick={handleStartOver}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              🔄 Start Over
            </button>
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

        {currentProject && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{currentProject.name}</h2>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Template:</label>
            {TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => handleSetTemplate(template.id)}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                title={template.description}
              >
                {template.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Locale:
              </label>
              <select
                value={currentLocale}
                onChange={(e) => setCurrentLocale(e.target.value as Locale)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locales.map((locale) => {
                  const localeInfo = COMMON_LOCALES.find(l => l.code === locale);
                  const enOverlay = slides[0]?.overlays['en'];
                  const currentOverlay = slides[0]?.overlays[locale];
                  const isDraft = locale !== 'en' && 
                    enOverlay && currentOverlay && 
                    enOverlay.headline === currentOverlay.headline &&
                    enOverlay.subhead === currentOverlay.subhead;
                  
                  return (
                    <option key={locale} value={locale}>
                      {localeInfo ? `${localeInfo.flag} ${localeInfo.name}` : locale}
                      {isDraft ? ' (draft)' : ''}
                    </option>
                  );
                })}
              </select>
              {currentLocale !== 'en' && slides.length > 0 && (() => {
                const enOverlay = slides[0]?.overlays['en'];
                const currentOverlay = slides[0]?.overlays[currentLocale];
                const isDraft = enOverlay && currentOverlay && 
                  enOverlay.headline === currentOverlay.headline &&
                  enOverlay.subhead === currentOverlay.subhead;
                
                return isDraft ? (
                  <span className="text-xs text-orange-600 italic">
                    English draft — ask ChatGPT to rewrite
                  </span>
                ) : null;
              })()}
            </div>

            <div className="flex items-center gap-2">
              {showAddLocale ? (
                <>
                  <select
                    value={newLocaleCode}
                    onChange={(e) => setNewLocaleCode(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select locale...</option>
                    {COMMON_LOCALES.filter(l => !locales.includes(l.code)).map(locale => (
                      <option key={locale.code} value={locale.code}>
                        {locale.flag} {locale.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => newLocaleCode && handleAddLocale(newLocaleCode)}
                    disabled={!newLocaleCode}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-300"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLocale(false);
                      setNewLocaleCode('');
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAddLocale(true)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  + Add Locale
                </button>
              )}
              <span className="text-xs text-gray-500">
                💬 ChatGPT writes this locale via tools
              </span>
            </div>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Export ZIP
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                📸 Replace Screenshots
              </button>
              <span className="text-sm text-gray-600">
                Click to select up to 5 new images
              </span>
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
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            currentLocale={currentLocale}
            onToggleLock={toggleLock}
            onFileUpload={(file) => handleFileUpload(slide.id, file)}
          />
        ))}
      </div>
    </div>
  );
}
