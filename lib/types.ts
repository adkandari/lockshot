export type Locale = "en" | "de" | "es" | "ja";

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
