import { Project, SlideData } from './types';

const STORAGE_KEY = 'lockshot-projects';
const CURRENT_PROJECT_KEY = 'lockshot-current-project';

export function saveProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save projects:', error);
  }
}

export function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
}

export function saveCurrentProjectId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    } else {
      localStorage.setItem(CURRENT_PROJECT_KEY, id);
    }
  } catch (error) {
    console.error('Failed to save current project:', error);
  }
}

export function loadCurrentProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  } catch (error) {
    console.error('Failed to load current project:', error);
    return null;
  }
}

export function createProject(
  name: string,
  storeUrl: string,
  slides: SlideData[],
  locales: string[] = ['en']
): Project {
  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    storeUrl,
    locales,
    slides,
    createdAt: Date.now(),
  };
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  saveProjects(projects);
}

export function loadProject(id: string): Project | null {
  const projects = loadProjects();
  return projects.find(p => p.id === id) || null;
}

export function deleteProject(id: string): void {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== id);
  saveProjects(filtered);
  
  if (loadCurrentProjectId() === id) {
    saveCurrentProjectId(null);
  }
}

export function parseAppStoreUrl(url: string): string | null {
  const match = url.match(/\/id(\d+)/);
  return match ? match[1] : null;
}
