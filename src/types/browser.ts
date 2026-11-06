export type BrowserMode = 'proxy' | 'direct' | 'reader';
export type DeviceViewport = 'desktop' | 'tablet' | 'mobile';

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  mode: BrowserMode;
  canGoBack: boolean;
  canGoForward: boolean;
  historyIndex: number;
  historyStack: string[];
  isPinned?: boolean;
  isMuted?: boolean;
  deviceViewport: DeviceViewport;
  zoom: number; // percentage, e.g., 100
  lastAccessed: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  folderId?: string;
  tags?: string[];
  createdAt: number;
  notes?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  visitedAt: number;
  visitCount: number;
  device?: string;
}

export interface SearchEngine {
  id: string;
  name: string;
  searchUrl: string; // %s replaced with query
  icon: string;
  placeholder: string;
}

export interface SyncDevice {
  id: string;
  name: string;
  lastSeen: number;
}

export interface SyncDataPayload {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  history: HistoryItem[];
  openTabs: { url: string; title: string; favicon?: string }[];
  updatedAt: number;
  devices?: SyncDevice[];
}

export interface BrowserSettings {
  defaultSearchEngine: string;
  defaultMode: BrowserMode;
  showBookmarksBar: boolean;
  theme: 'dark' | 'midnight' | 'cyberpunk' | 'light' | 'solarized';
  syncKey: string;
  deviceName: string;
  deviceId: string;
  autoSync: boolean;
}
