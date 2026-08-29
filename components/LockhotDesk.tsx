"use client";

import { useEffect, useState, useRef } from "react";
import { Locale, SlideData, Project, iTunesLookupResult } from "@/lib/types";
import { HABIT_APP } from "@/lib/sampleData";
import { exportZip } from "@/lib/export";
import { registerWebMCPTools, getWebMCPState } from "@/lib/webmcp";
import {
  loadProjects,
  saveProject,
  loadCurrentProjectId,
  saveCurrentProjectId,
  createProject,
  parseAppStoreUrl,
} from "@/lib/storage";
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

export default function LockhotDesk() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const [locales, setLocales] = useState<Locale[]>(["en"]);
  const [webMcpState, setWebMcpState] = useState({ enabled: false, error: null as string | null });
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [showAddLocale, setShowAddLocale] = useState(false);
  const [newLocaleCode, setNewLocaleCode] = useState("");
  
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
      } else {
        setSlides(HABIT_APP.slides);
      }
    } else {
      setSlides(HABIT_APP.slides);
    }
  }, []);

  useEffect(() => {
    if (currentProject) {
      saveProject(currentProject);
    }
  }, [currentProject]);

  const handleImportAppStore = async (url: string): Promise<{ success: boolean; error?: string; project?: Project }> => {
    const appId = parseAppStoreUrl(url);
    if (!appId) {
      return { success: false, error: 'Invalid App Store URL format' };
    }

    setImporting(true);
    try {
      const response = await fetch(`/api/appstore?id=${appId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch app data');
      }

      const data: iTunesLookupResult = await response.json();
      
      if (data.resultCount === 0 || !data.results[0]) {
        return { success: false, error: 'App not found' };
      }

      const appData = data.results[0];
      const screenshotUrls = appData.screenshotUrls.slice(0, 5);

      const newSlides: SlideData[] = await Promise.all(
        screenshotUrls.map(async (screenshotUrl, index) => {
          const proxyUrl = `/api/image?url=${encodeURIComponent(screenshotUrl)}`;
          
          const overlay = {
            headline: index === 0 ? appData.trackName : `Feature ${index + 1}`,
            subhead: index === 0 
              ? (appData.description?.split('\n')[0]?.substring(0, 50) || 'Download now')
              : 'Discover more',
          };

          return {
            id: index + 1,
            templateId: index % 2 === 0 ? "gradient" as const : "framed" as const,
            backgroundImage: proxyUrl,
            overlays: { en: overlay },
            locked: false,
            comments: [],
            overflow: { en: measureOverflow(overlay) },
          };
        })
      );

      const project = createProject(appData.trackName, url, newSlides, ['en']);
      
      setCurrentProject(project);
      setSlides(project.slides);
      setLocales(project.locales);
      setCurrentLocale('en');
      saveProject(project);
      saveCurrentProjectId(project.id);
      setImportUrl('');

      return { success: true, project };
    } catch (error) {
      console.error('Import error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Import failed' 
      };
    } finally {
      setImporting(false);
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

    setShowAddLocale(false);
    setNewLocaleCode('');
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
      handleImportAppStore,
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
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSlides(prev => {
        const updated = prev.map(s => {
          if (s.id === slideId) {
            return { ...s, backgroundImage: dataUrl };
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
    reader.readAsDataURL(file);
  };

  const statusText = webMcpState.error 
    ? `WebMCP Error: ${webMcpState.error}`
    : webMcpState.enabled 
      ? "WebMCP Active" 
      : "WebMCP Not Detected";

  const isEmptyState = !currentProject;

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

        {isEmptyState && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              👋 <strong>Demo Mode:</strong> You're viewing the sample Habit app. Import a real App Store app below to get started.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Paste App Store URL (e.g., https://apps.apple.com/us/app/example/id123456789)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={importing}
            />
            <button
              onClick={() => handleImportAppStore(importUrl)}
              disabled={importing || !importUrl}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>

          {currentProject && (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{currentProject.name}</h2>
                <p className="text-sm text-gray-500">{currentProject.storeUrl}</p>
              </div>
            </div>
          )}

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
                  return (
                    <option key={locale} value={locale}>
                      {localeInfo ? `${localeInfo.flag} ${localeInfo.name}` : locale}
                    </option>
                  );
                })}
              </select>
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
            </div>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Export ZIP
            </button>
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
