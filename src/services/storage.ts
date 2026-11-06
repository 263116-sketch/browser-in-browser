import {
  Bookmark,
  BookmarkFolder,
  BrowserSettings,
  HistoryItem,
  SyncDataPayload,
  Tab,
} from '../types/browser';

const STORAGE_KEYS = {
  BOOKMARKS: 'omnibrowser_bookmarks_v1',
  FOLDERS: 'omnibrowser_folders_v1',
  HISTORY: 'omnibrowser_history_v1',
  TABS: 'omnibrowser_tabs_v1',
  ACTIVE_TAB: 'omnibrowser_active_tab_v1',
  SETTINGS: 'omnibrowser_settings_v1',
  LAST_SYNC: 'omnibrowser_last_sync_v1',
};

// Default initial folders
export const DEFAULT_FOLDERS: BookmarkFolder[] = [
  { id: 'folder-favorites', name: 'Favorites', color: '#38bdf8', createdAt: Date.now() - 100000 },
  { id: 'folder-tech', name: 'Tech & Dev', color: '#a855f7', createdAt: Date.now() - 90000 },
  { id: 'folder-knowledge', name: 'Knowledge & News', color: '#10b981', createdAt: Date.now() - 80000 },
];

// Default initial bookmarks
export const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm-wiki',
    title: 'Wikipedia, the free encyclopedia',
    url: 'https://en.wikipedia.org',
    favicon: 'https://www.google.com/s2/favicons?domain=en.wikipedia.org&sz=64',
    folderId: 'folder-knowledge',
    tags: ['wiki', 'reference'],
    createdAt: Date.now() - 70000,
  },
  {
    id: 'bm-hn',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
    favicon: 'https://www.google.com/s2/favicons?domain=news.ycombinator.com&sz=64',
    folderId: 'folder-tech',
    tags: ['tech', 'news'],
    createdAt: Date.now() - 60000,
  },
  {
    id: 'bm-github',
    title: 'GitHub',
    url: 'https://github.com',
    favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
    folderId: 'folder-tech',
    tags: ['coding', 'git'],
    createdAt: Date.now() - 50000,
  },
  {
    id: 'bm-archive',
    title: 'Internet Archive: Wayback Machine',
    url: 'https://archive.org',
    favicon: 'https://www.google.com/s2/favicons?domain=archive.org&sz=64',
    folderId: 'folder-knowledge',
    tags: ['archive', 'history'],
    createdAt: Date.now() - 40000,
  },
  {
    id: 'bm-mdn',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    favicon: 'https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=64',
    folderId: 'folder-favorites',
    tags: ['docs', 'web'],
    createdAt: Date.now() - 30000,
  },
  {
    id: 'bm-worldnews',
    title: 'BBC News',
    url: 'https://www.bbc.com/news',
    favicon: 'https://www.google.com/s2/favicons?domain=bbc.com&sz=64',
    folderId: 'folder-knowledge',
    tags: ['news', 'global'],
    createdAt: Date.now() - 20000,
  },
];

// Helper to generate a memorable default sync key
export function generateRandomSyncKey(): string {
  const adjectives = ['ORBIT', 'COSMIC', 'NEBULA', 'AURORA', 'SOLAR', 'VORTEX', 'STELLAR', 'QUANTUM', 'CHROMA'];
  const nouns = ['PULSE', 'SHIELD', 'SPHERE', 'NODE', 'HORIZON', 'CORE', 'BEACON', 'MATRIX'];
  const num = Math.floor(1000 + Math.random() * 9000);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${num}`;
}

// Generate device name
function getDeviceLabel(): string {
  if (typeof window === 'undefined') return 'Device';
  const ua = navigator.userAgent;
  let os = 'Desktop';
  if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS Device';
  else if (/Android/.test(ua)) os = 'Android Device';
  else if (/Macintosh/.test(ua)) os = 'Mac';
  else if (/Windows/.test(ua)) os = 'Windows PC';
  else if (/Linux/.test(ua)) os = 'Linux PC';

  return `${os} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;
}

export function loadSettings(): BrowserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const newSettings: BrowserSettings = {
    defaultSearchEngine: 'google',
    defaultMode: 'proxy',
    showBookmarksBar: true,
    theme: 'midnight',
    syncKey: generateRandomSyncKey(),
    deviceName: getDeviceLabel(),
    deviceId: 'dev-' + Math.random().toString(36).substring(2, 9),
    autoSync: true,
  };
  saveSettings(newSettings);
  return newSettings;
}

export function saveSettings(settings: BrowserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {}
}

export function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  saveBookmarks(DEFAULT_BOOKMARKS);
  return DEFAULT_BOOKMARKS;
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {}
}

export function loadFolders(): BookmarkFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  saveFolders(DEFAULT_FOLDERS);
  return DEFAULT_FOLDERS;
}

export function saveFolders(folders: BookmarkFolder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (e) {}
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveHistory(history: HistoryItem[]): void {
  try {
    // Keep up to 500 items to avoid storage exhaustion
    const trimmed = history.slice(0, 500);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
  } catch (e) {}
}

export function addHistoryEntry(item: { url: string; title: string; favicon?: string; device?: string }): HistoryItem[] {
  const current = loadHistory();
  const existingIdx = current.findIndex(h => h.url === item.url);
  const now = Date.now();

  let updated: HistoryItem[];
  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    const itemUpdated: HistoryItem = {
      ...existing,
      title: item.title || existing.title,
      favicon: item.favicon || existing.favicon,
      visitedAt: now,
      visitCount: (existing.visitCount || 1) + 1,
      device: item.device || existing.device,
    };
    updated = [itemUpdated, ...current.filter((_, idx) => idx !== existingIdx)];
  } else {
    const newItem: HistoryItem = {
      id: 'hist-' + Math.random().toString(36).substring(2, 9),
      url: item.url,
      title: item.title || item.url,
      favicon: item.favicon || `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`,
      visitedAt: now,
      visitCount: 1,
      device: item.device || 'Current Device',
    };
    updated = [newItem, ...current];
  }

  saveHistory(updated);
  return updated;
}

// Cloud Synchronization
export async function pushSyncToCloud(
  syncKey: string,
  data: {
    bookmarks: Bookmark[];
    folders: BookmarkFolder[];
    history: HistoryItem[];
    openTabs: Tab[];
    deviceId: string;
    deviceName: string;
  }
): Promise<{ success: boolean; updatedAt: number; deviceCount: number }> {
  const sanitizedKey = syncKey.trim().toUpperCase();
  const payload = {
    bookmarks: data.bookmarks,
    folders: data.folders,
    history: data.history.slice(0, 300),
    openTabs: data.openTabs.map(t => ({ url: t.url, title: t.title, favicon: t.favicon })),
    deviceId: data.deviceId,
    deviceName: data.deviceName,
  };

  const res = await fetch(`/api/sync/${sanitizedKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Sync failed with status ${res.status}`);
  }

  const json = await res.json();
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(json.updatedAt || Date.now()));
  return json;
}

export async function pullSyncFromCloud(syncKey: string): Promise<SyncDataPayload | null> {
  const sanitizedKey = syncKey.trim().toUpperCase();
  const res = await fetch(`/api/sync/${sanitizedKey}`);

  if (res.status === 404) {
    return null; // Key hasn't been created on server yet
  }

  if (!res.ok) {
    throw new Error(`Pull sync failed with status ${res.status}`);
  }

  return await res.json();
}

// Merges remote data with local data without losing local modifications
export function mergeSyncData(
  local: { bookmarks: Bookmark[]; folders: BookmarkFolder[]; history: HistoryItem[] },
  remote: SyncDataPayload
): {
  mergedBookmarks: Bookmark[];
  mergedFolders: BookmarkFolder[];
  mergedHistory: HistoryItem[];
} {
  // Merge bookmarks by URL
  const bookmarkMap = new Map<string, Bookmark>();
  local.bookmarks.forEach(b => bookmarkMap.set(b.url, b));
  (remote.bookmarks || []).forEach(rb => {
    if (!bookmarkMap.has(rb.url)) {
      bookmarkMap.set(rb.url, rb);
    } else {
      const existing = bookmarkMap.get(rb.url)!;
      // Keep newer or richer data
      bookmarkMap.set(rb.url, {
        ...existing,
        title: rb.title || existing.title,
        tags: Array.from(new Set([...(existing.tags || []), ...(rb.tags || [])])),
        notes: rb.notes || existing.notes,
        folderId: rb.folderId || existing.folderId,
      });
    }
  });

  // Merge folders by ID or Name
  const folderMap = new Map<string, BookmarkFolder>();
  local.folders.forEach(f => folderMap.set(f.id, f));
  (remote.folders || []).forEach(rf => {
    if (!folderMap.has(rf.id)) {
      folderMap.set(rf.id, rf);
    }
  });

  // Merge history by URL, picking highest visit count and latest visitedAt
  const historyMap = new Map<string, HistoryItem>();
  local.history.forEach(h => historyMap.set(h.url, h));
  (remote.history || []).forEach(rh => {
    if (!historyMap.has(rh.url)) {
      historyMap.set(rh.url, rh);
    } else {
      const existing = historyMap.get(rh.url)!;
      historyMap.set(rh.url, {
        ...existing,
        visitedAt: Math.max(existing.visitedAt, rh.visitedAt),
        visitCount: Math.max(existing.visitCount, rh.visitCount),
        title: rh.title || existing.title,
        device: rh.device || existing.device,
      });
    }
  });

  const mergedBookmarks = Array.from(bookmarkMap.values());
  const mergedFolders = Array.from(folderMap.values());
  const mergedHistory = Array.from(historyMap.values()).sort((a, b) => b.visitedAt - a.visitedAt);

  return {
    mergedBookmarks,
    mergedFolders,
    mergedHistory,
  };
}
