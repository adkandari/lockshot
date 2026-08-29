export type Locale = string;

export interface SlideOverlay {
  headline: string;
  subhead: string;
}

export interface SlideData {
  id: number;
  templateId: "gradient" | "framed";
  backgroundImage: string;
  overlays: Record<Locale, SlideOverlay>;
  locked: boolean;
  comments: string[];
  overflow: Record<Locale, boolean>;
}

export interface Project {
  id: string;
  name: string;
  storeUrl: string;
  locales: Locale[];
  slides: SlideData[];
  createdAt: number;
}

export interface AppData {
  name: string;
  slides: SlideData[];
}

export interface PageState {
  currentLocale: Locale;
  slides: SlideData[];
}

export interface WebMCPTool {
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
}

export interface iTunesLookupResult {
  resultCount: number;
  results: Array<{
    trackId: number;
    trackName: string;
    description: string;
    screenshotUrls: string[];
    artistName?: string;
  }>;
}
