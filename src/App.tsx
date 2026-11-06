/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bookmark,
  BookmarkFolder,
  BrowserMode,
  BrowserSettings,
  DeviceViewport,
  HistoryItem,
  SearchEngine,
  SyncDevice,
  Tab,
} from './types/browser';
import {
  loadBookmarks,
  saveBookmarks,
  loadFolders,
  saveFolders,
  loadHistory,
  saveHistory,
  addHistoryEntry,
  loadSettings,
  saveSettings,
  pullSyncFromCloud,
  pushSyncToCloud,
  mergeSyncData,
} from './services/storage';
import {
  resolveInputToUrl,
  SEARCH_ENGINES,
  getFaviconUrl,
  getCleanHost,
} from './services/browserEngines';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { BookmarksBar } from './components/BookmarksBar';
import { BrowserViewport } from './components/BrowserViewport';
import { SyncModal } from './components/SyncModal';
import { BookmarksManagerModal } from './components/BookmarksManagerModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';

const INITIAL_TAB: Tab = {
  id: 'tab-1',
  url: 'omni://newtab',
  title: 'New Tab',
  isLoading: false,
  mode: 'proxy',
  canGoBack: false,
  canGoForward: false,
  historyIndex: 0,
  historyStack: ['omni://newtab'],
  deviceViewport: 'desktop',
  zoom: 100,
  lastAccessed: Date.now(),
};

export default function App() {
  // Core Browser State
  const [tabs, setTabs] = useState<Tab[]>([INITIAL_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [splitTabId, setSplitTabId] = useState<string | null>(null);

  // User Data State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<BrowserSettings>(() => loadSettings());

  // Cloud Sync Status & Connected Devices
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'synced' | 'error';
    lastSynced: number | null;
    connectedDevices: number;
    error?: string;
  }>({
    status: 'idle',
    lastSynced: null,
    connectedDevices: 1,
  });
  const [pairedDevices, setPairedDevices] = useState<SyncDevice[]>([]);

  // Modals & Panels
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [bookmarksManagerOpen, setBookmarksManagerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Debounce ref for cloud push
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize on mount
  useEffect(() => {
    // 1. Check if user came from a pairing link (e.g. ?sync=KEY)
    let activeSyncKey = settings.syncKey;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSyncKey = params.get('sync');
      if (urlSyncKey) {
        const cleanKey = urlSyncKey.trim().toUpperCase();
        activeSyncKey = cleanKey;
        const updatedSettings = { ...settings, syncKey: cleanKey };
        setSettings(updatedSettings);
        saveSettings(updatedSettings);
        // Clean URL parameter without reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // 2. Load stored data
    const localBm = loadBookmarks();
    const localFolders = loadFolders();
    const localHistory = loadHistory();
    setBookmarks(localBm);
    setFolders(localFolders);
    setHistory(localHistory);

    // 3. Initial sync pull
    performCloudPull(activeSyncKey, localBm, localFolders, localHistory);
  }, []);

  // Periodic Auto-Sync Timer (every 20s if enabled)
  useEffect(() => {
    if (!settings.autoSync || !settings.syncKey) return;

    const interval = setInterval(() => {
      performCloudPull(settings.syncKey, bookmarks, folders, history);
    }, 20000);

    return () => clearInterval(interval);
  }, [settings.autoSync, settings.syncKey, bookmarks, folders, history]);

  // Cloud Pull Implementation
  const performCloudPull = async (
    syncKey: string,
    currentBm = bookmarks,
    currentFolders = folders,
    currentHist = history
  ) => {
    try {
      const remoteData = await pullSyncFromCloud(syncKey);
      if (remoteData) {
        const { mergedBookmarks, mergedFolders, mergedHistory } = mergeSyncData(
          { bookmarks: currentBm, folders: currentFolders, history: currentHist },
          remoteData
        );
        setBookmarks(mergedBookmarks);
        saveBookmarks(mergedBookmarks);
        setFolders(mergedFolders);
        saveFolders(mergedFolders);
        setHistory(mergedHistory);
        saveHistory(mergedHistory);

        if (remoteData.devices) {
          setPairedDevices(remoteData.devices.filter((d) => d.id !== settings.deviceId));
        }

        setSyncStatus({
          status: 'synced',
          lastSynced: remoteData.updatedAt || Date.now(),
          connectedDevices: (remoteData.devices?.length || 1),
        });
      } else {
        // If remote doesn't exist yet, seed it with local data
        scheduleCloudPush(currentBm, currentFolders, currentHist, tabs);
      }
    } catch (err: any) {
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        error: err?.message || 'Sync failed',
      }));
    }
  };

  // Cloud Push Implementation with Debounce
  const scheduleCloudPush = useCallback(
    (
      currentBm: Bookmark[],
      currentFolders: BookmarkFolder[],
      currentHist: HistoryItem[],
      currentTabs: Tab[]
    ) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(async () => {
        setSyncStatus((prev) => ({ ...prev, status: 'syncing' }));
        try {
          const res = await pushSyncToCloud(settings.syncKey, {
            bookmarks: currentBm,
            folders: currentFolders,
            history: currentHist,
            openTabs: currentTabs,
            deviceId: settings.deviceId,
            deviceName: settings.deviceName,
          });

          setSyncStatus({
            status: 'synced',
            lastSynced: res.updatedAt || Date.now(),
            connectedDevices: res.deviceCount || 1,
          });
        } catch (err: any) {
          setSyncStatus((prev) => ({
            ...prev,
            status: 'error',
            error: err?.message || 'Cloud push failed',
          }));
        }
      }, 1000);
    },
    [settings.syncKey, settings.deviceId, settings.deviceName]
  );

  // Active Tab reference
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || INITIAL_TAB;
  const splitTab = splitTabId ? tabs.find((t) => t.id === splitTabId) || null : null;
  const isCurrentBookmarked = bookmarks.some((b) => b.url === activeTab.url);

  // Tab Handlers
  const handleNewTab = (url = 'omni://newtab') => {
    const newId = 'tab-' + Math.random().toString(36).substring(2, 9);
    const newTab: Tab = {
      id: newId,
      url,
      title: url === 'omni://newtab' ? 'New Tab' : getCleanHost(url),
      favicon: getFaviconUrl(url),
      isLoading: url !== 'omni://newtab',
      mode: settings.defaultMode,
      canGoBack: false,
      canGoForward: false,
      historyIndex: 0,
      historyStack: [url],
      deviceViewport: 'desktop',
      zoom: 100,
      lastAccessed: Date.now(),
    };

    const updatedTabs = [...tabs, newTab];
    setTabs(updatedTabs);
    setActiveTabId(newId);

    // If navigating to an actual website, record in history
    if (url !== 'omni://newtab') {
      const updatedHist = addHistoryEntry({
        url,
        title: newTab.title,
        favicon: newTab.favicon,
        device: settings.deviceName,
      });
      setHistory(updatedHist);
      scheduleCloudPush(bookmarks, folders, updatedHist, updatedTabs);
    }
  };

  const handleCloseTab = (idToClose: string) => {
    if (tabs.length === 1) {
      // If closing the last tab, reset it to new tab
      handleUpdateTabInfo(tabs[0].id, {
        url: 'omni://newtab',
        title: 'New Tab',
        historyStack: ['omni://newtab'],
        historyIndex: 0,
        canGoBack: false,
        canGoForward: false,
      });
      return;
    }

    const index = tabs.findIndex((t) => t.id === idToClose);
    const updatedTabs = tabs.filter((t) => t.id !== idToClose);
    setTabs(updatedTabs);

    if (splitTabId === idToClose) {
      setSplitTabId(null);
    }

    if (activeTabId === idToClose) {
      const nextTab = updatedTabs[Math.max(0, index - 1)];
      if (nextTab) setActiveTabId(nextTab.id);
    }

    scheduleCloudPush(bookmarks, folders, history, updatedTabs);
  };

  const handleUpdateTabInfo = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t))
    );
  }, []);

  // Main Navigation Handler
  const handleNavigate = (rawInput: string, targetTabId = activeTabId) => {
    const resolvedUrl = resolveInputToUrl(rawInput, settings.defaultSearchEngine);
    const isNewTab = resolvedUrl === 'omni://newtab';

    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== targetTabId) return tab;

        const currentStack = tab.historyStack.slice(0, tab.historyIndex + 1);
        const newStack = [...currentStack, resolvedUrl];
        const newIndex = newStack.length - 1;

        return {
          ...tab,
          url: resolvedUrl,
          title: isNewTab ? 'New Tab' : getCleanHost(resolvedUrl),
          favicon: getFaviconUrl(resolvedUrl),
          isLoading: !isNewTab,
          historyStack: newStack,
          historyIndex: newIndex,
          canGoBack: newIndex > 0,
          canGoForward: false,
          lastAccessed: Date.now(),
        };
      })
    );

    // Record in history if real webpage
    if (!isNewTab) {
      const updatedHist = addHistoryEntry({
        url: resolvedUrl,
        title: getCleanHost(resolvedUrl),
        favicon: getFaviconUrl(resolvedUrl),
        device: settings.deviceName,
      });
      setHistory(updatedHist);
      scheduleCloudPush(bookmarks, folders, updatedHist, tabs);
    }
  };

  const handleGoBack = () => {
    if (activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      const targetUrl = activeTab.historyStack[newIndex];
      handleUpdateTabInfo(activeTab.id, {
        url: targetUrl,
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: true,
        isLoading: targetUrl !== 'omni://newtab',
      });
    }
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex < activeTab.historyStack.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      const targetUrl = activeTab.historyStack[newIndex];
      handleUpdateTabInfo(activeTab.id, {
        url: targetUrl,
        historyIndex: newIndex,
        canGoBack: true,
        canGoForward: newIndex < activeTab.historyStack.length - 1,
        isLoading: targetUrl !== 'omni://newtab',
      });
    }
  };

  const handleReload = () => {
    if (activeTab.isLoading) {
      // Stop loading
      handleUpdateTabInfo(activeTab.id, { isLoading: false });
    } else {
      // Reload
      handleUpdateTabInfo(activeTab.id, { isLoading: true });
      // Force iframe refresh by triggering navigation to same url
      setTimeout(() => {
        handleUpdateTabInfo(activeTab.id, { isLoading: false });
      }, 1000);
    }
  };

  // Bookmarking Handlers
  const handleToggleBookmark = (tab: Tab) => {
    const existing = bookmarks.find((b) => b.url === tab.url);
    let updated: Bookmark[];
    if (existing) {
      updated = bookmarks.filter((b) => b.id !== existing.id);
    } else {
      const newBookmark: Bookmark = {
        id: 'bm-' + Math.random().toString(36).substring(2, 9),
        title: tab.title || getCleanHost(tab.url),
        url: tab.url,
        favicon: tab.favicon,
        folderId: folders[0]?.id || 'folder-favorites',
        tags: [],
        createdAt: Date.now(),
      };
      updated = [newBookmark, ...bookmarks];
    }
    setBookmarks(updated);
    saveBookmarks(updated);
    scheduleCloudPush(updated, folders, history, tabs);
  };

  const handleSaveBookmarkWithOptions = (
    title: string,
    url: string,
    folderId: string,
    tags: string[]
  ) => {
    const existingIdx = bookmarks.findIndex((b) => b.url === url);
    let updated: Bookmark[];
    if (existingIdx >= 0) {
      updated = bookmarks.map((b, i) =>
        i === existingIdx ? { ...b, title, folderId, tags } : b
      );
    } else {
      const newBookmark: Bookmark = {
        id: 'bm-' + Math.random().toString(36).substring(2, 9),
        title,
        url,
        favicon: getFaviconUrl(url),
        folderId,
        tags,
        createdAt: Date.now(),
      };
      updated = [newBookmark, ...bookmarks];
    }
    setBookmarks(updated);
    saveBookmarks(updated);
    scheduleCloudPush(updated, folders, history, tabs);
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    saveBookmarks(updated);
    scheduleCloudPush(updated, folders, history, tabs);
  };

  // Folder Handlers
  const handleCreateFolder = (name: string, color: string) => {
    const newFolder: BookmarkFolder = {
      id: 'folder-' + Math.random().toString(36).substring(2, 7),
      name,
      color,
      createdAt: Date.now(),
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveFolders(updated);
    scheduleCloudPush(bookmarks, updated, history, tabs);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    // Move bookmarks in this folder to unfiled
    const updatedBookmarks = bookmarks.map((b) =>
      b.folderId === folderId ? { ...b, folderId: undefined } : b
    );
    setFolders(updatedFolders);
    saveFolders(updatedFolders);
    setBookmarks(updatedBookmarks);
    saveBookmarks(updatedBookmarks);
    scheduleCloudPush(updatedBookmarks, updatedFolders, history, tabs);
  };

  // History Handlers
  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
    scheduleCloudPush(bookmarks, folders, updated, tabs);
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    saveHistory([]);
    scheduleCloudPush(bookmarks, folders, [], tabs);
  };

  // Split View
  const handleToggleSplitView = () => {
    if (splitTabId) {
      setSplitTabId(null);
    } else {
      // Pick another tab if available, or create a new tab for split view
      const otherTab = tabs.find((t) => t.id !== activeTabId);
      if (otherTab) {
        setSplitTabId(otherTab.id);
      } else {
        // Create new tab and split it
        const newId = 'tab-split-' + Math.random().toString(36).substring(2, 7);
        const newTab: Tab = {
          id: newId,
          url: 'https://en.wikipedia.org',
          title: 'Wikipedia',
          favicon: 'https://www.google.com/s2/favicons?domain=en.wikipedia.org&sz=64',
          isLoading: false,
          mode: 'proxy',
          canGoBack: false,
          canGoForward: false,
          historyIndex: 0,
          historyStack: ['https://en.wikipedia.org'],
          deviceViewport: 'desktop',
          zoom: 100,
          lastAccessed: Date.now(),
        };
        setTabs([...tabs, newTab]);
        setSplitTabId(newId);
      }
    }
  };

  // Sync Vault Update
  const handleUpdateSyncKey = async (newKey: string) => {
    const cleanKey = newKey.trim().toUpperCase();
    const updated = { ...settings, syncKey: cleanKey };
    setSettings(updated);
    saveSettings(updated);
    await performCloudPull(cleanKey);
  };

  const handleTriggerSyncNow = async () => {
    await performCloudPull(settings.syncKey);
    await pushSyncToCloud(settings.syncKey, {
      bookmarks,
      folders,
      history,
      openTabs: tabs,
      deviceId: settings.deviceId,
      deviceName: settings.deviceName,
    });
  };

  const handleImportBackup = (backup: any) => {
    if (backup.bookmarks && Array.isArray(backup.bookmarks)) {
      setBookmarks(backup.bookmarks);
      saveBookmarks(backup.bookmarks);
    }
    if (backup.folders && Array.isArray(backup.folders)) {
      setFolders(backup.folders);
      saveFolders(backup.folders);
    }
    if (backup.history && Array.isArray(backup.history)) {
      setHistory(backup.history);
      saveHistory(backup.history);
    }
    if (backup.syncKey) {
      const updated = { ...settings, syncKey: backup.syncKey };
      setSettings(updated);
      saveSettings(updated);
    }
    scheduleCloudPush(
      backup.bookmarks || bookmarks,
      backup.folders || folders,
      backup.history || history,
      tabs
    );
    alert('Backup successfully imported and synced!');
  };

  const handleClearCloudData = async () => {
    try {
      await fetch(`/api/sync/${settings.syncKey}`, { method: 'DELETE' });
      setSyncStatus((prev) => ({ ...prev, status: 'idle', connectedDevices: 1 }));
      alert('Cloud vault data cleared for this key.');
    } catch {
      alert('Failed to clear cloud data.');
    }
  };

  const handleResetAllData = () => {
    localStorage.clear();
    setBookmarks([]);
    setFolders([]);
    setHistory([]);
    setTabs([INITIAL_TAB]);
    setActiveTabId('tab-1');
    setSplitTabId(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T: New tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleNewTab();
      }
      // Ctrl/Cmd + W: Close tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseTab(activeTabId);
      }
      // Ctrl/Cmd + H: History
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setHistoryDrawerOpen((prev) => !prev);
      }
      // Ctrl/Cmd + B: Bookmarks
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setBookmarksManagerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 1. Chrome / Arc style Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        splitTabId={splitTabId}
        onSelectTab={(id) => setActiveTabId(id)}
        onCloseTab={handleCloseTab}
        onNewTab={() => handleNewTab()}
        onTogglePinTab={(id) => {
          handleUpdateTabInfo(id, { isPinned: !tabs.find((t) => t.id === id)?.isPinned });
        }}
        onToggleSplitView={handleToggleSplitView}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />

      {/* 2. Omnibox & Navigation Bar */}
      <AddressBar
        activeTab={activeTab}
        isBookmarked={isCurrentBookmarked}
        searchEngines={SEARCH_ENGINES}
        selectedEngineId={settings.defaultSearchEngine}
        folders={folders}
        bookmarks={bookmarks}
        history={history}
        syncStatus={syncStatus}
        onNavigate={(url) => handleNavigate(url)}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onGoHome={() => handleNavigate('omni://newtab')}
        onToggleBookmark={handleToggleBookmark}
        onSaveBookmarkWithOptions={handleSaveBookmarkWithOptions}
        onChangeMode={(mode) => handleUpdateTabInfo(activeTab.id, { mode })}
        onChangeViewport={(deviceViewport) => handleUpdateTabInfo(activeTab.id, { deviceViewport })}
        onChangeZoom={(delta) => {
          const newZoom = Math.min(200, Math.max(50, activeTab.zoom + delta));
          handleUpdateTabInfo(activeTab.id, { zoom: newZoom });
        }}
        onSelectSearchEngine={(id) => {
          const updated = { ...settings, defaultSearchEngine: id };
          setSettings(updated);
          saveSettings(updated);
        }}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        onOpenBookmarksManager={() => setBookmarksManagerOpen(true)}
        onOpenHistory={() => setHistoryDrawerOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* 3. Bookmarks Toolbar (if enabled) */}
      {settings.showBookmarksBar && (
        <BookmarksBar
          bookmarks={bookmarks}
          folders={folders}
          onNavigate={(url) => handleNavigate(url)}
          onOpenBookmarksManager={() => setBookmarksManagerOpen(true)}
          onDeleteBookmark={handleDeleteBookmark}
        />
      )}

      {/* 4. Main Web Viewport & Split Screen Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-[#09090b]">
        <BrowserViewport
          activeTab={activeTab}
          splitTab={splitTab}
          bookmarks={bookmarks}
          history={history}
          searchEngines={SEARCH_ENGINES}
          selectedEngineId={settings.defaultSearchEngine}
          syncKey={settings.syncKey}
          onNavigate={handleNavigate}
          onUpdateTabInfo={handleUpdateTabInfo}
          onSelectSearchEngine={(id) => {
            const updated = { ...settings, defaultSearchEngine: id };
            setSettings(updated);
            saveSettings(updated);
          }}
          onOpenSyncModal={() => setSyncModalOpen(true)}
          onCloseSplitView={() => setSplitTabId(null)}
        />
      </main>

      {/* Modals & Overlays */}
      <SyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        syncKey={settings.syncKey}
        onUpdateSyncKey={handleUpdateSyncKey}
        onTriggerSync={handleTriggerSyncNow}
        syncStatus={syncStatus}
        currentDeviceName={settings.deviceName}
        devices={pairedDevices}
        bookmarks={bookmarks}
        folders={folders}
        history={history}
        onImportBackup={handleImportBackup}
        onClearCloudData={handleClearCloudData}
      />

      <BookmarksManagerModal
        isOpen={bookmarksManagerOpen}
        onClose={() => setBookmarksManagerOpen(false)}
        bookmarks={bookmarks}
        folders={folders}
        onNavigate={(url) => handleNavigate(url)}
        onNewTab={(url) => handleNewTab(url)}
        onSaveBookmark={(bm) => {
          const exists = bookmarks.some((b) => b.id === bm.id);
          const updated = exists
            ? bookmarks.map((b) => (b.id === bm.id ? bm : b))
            : [bm, ...bookmarks];
          setBookmarks(updated);
          saveBookmarks(updated);
          scheduleCloudPush(updated, folders, history, tabs);
        }}
        onDeleteBookmark={handleDeleteBookmark}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <HistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        history={history}
        onNavigate={(url) => handleNavigate(url)}
        onNewTab={(url) => handleNewTab(url)}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        searchEngines={SEARCH_ENGINES}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
        onResetAllData={handleResetAllData}
      />
    </div>
  );
}
