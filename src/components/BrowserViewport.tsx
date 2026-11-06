import React, { useEffect, useState } from 'react';
import {
  Tab,
  Bookmark,
  HistoryItem,
  SearchEngine,
  DeviceViewport,
} from '../types/browser';
import { NewTabPage } from './NewTabPage';
import { ReaderModeView } from './ReaderModeView';
import { getIframeSrc, getCleanHost } from '../services/browserEngines';
import {
  Columns,
  X,
  AlertTriangle,
  ExternalLink,
  RotateCw,
  BookOpen,
} from 'lucide-react';

interface BrowserViewportProps {
  activeTab: Tab;
  splitTab: Tab | null;
  bookmarks: Bookmark[];
  history: HistoryItem[];
  searchEngines: Record<string, SearchEngine>;
  selectedEngineId: string;
  syncKey: string;
  onNavigate: (url: string, tabId?: string) => void;
  onUpdateTabInfo: (tabId: string, updates: Partial<Tab>) => void;
  onSelectSearchEngine: (id: string) => void;
  onOpenSyncModal: () => void;
  onCloseSplitView: () => void;
}

export const BrowserViewport: React.FC<BrowserViewportProps> = ({
  activeTab,
  splitTab,
  bookmarks,
  history,
  searchEngines,
  selectedEngineId,
  syncKey,
  onNavigate,
  onUpdateTabInfo,
  onSelectSearchEngine,
  onOpenSyncModal,
  onCloseSplitView,
}) => {
  // Track restricted sites detected via postMessage or known domains
  const [restrictedTabs, setRestrictedTabs] = useState<Record<string, boolean>>({});
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});

  // Listen to postMessage from internal proxy bridge script
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      const { type, url, title } = event.data;

      if (type === 'OMNI_BROWSER_NAVIGATE' && url) {
        onNavigate(url);
      } else if (type === 'OMNI_BROWSER_LOADED') {
        onUpdateTabInfo(activeTab.id, {
          isLoading: false,
          title: title || activeTab.title,
        });
      } else if (type === 'OMNI_SWITCH_DIRECT') {
        onUpdateTabInfo(activeTab.id, { mode: 'direct' });
      } else if (type === 'OMNI_SWITCH_READER') {
        onUpdateTabInfo(activeTab.id, { mode: 'reader' });
      } else if (type === 'OMNI_PAGE_RESTRICTED') {
        setRestrictedTabs((prev) => ({ ...prev, [activeTab.id]: true }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTab.id, activeTab.title, onNavigate, onUpdateTabInfo]);

  // Open URL in dedicated browser popup window
  const openInPopupWindow = (url: string) => {
    window.open(
      url,
      '_blank',
      'width=1150,height=850,resizable=yes,scrollbars=yes,status=yes'
    );
  };

  // Render single tab viewport pane
  const renderPane = (tab: Tab, isSplitPane = false) => {
    if (tab.url === 'omni://newtab') {
      return (
        <NewTabPage
          bookmarks={bookmarks}
          history={history}
          searchEngines={searchEngines}
          selectedEngineId={selectedEngineId}
          syncKey={syncKey}
          onNavigate={(url) => onNavigate(url, tab.id)}
          onSelectSearchEngine={onSelectSearchEngine}
          onOpenSyncModal={onOpenSyncModal}
        />
      );
    }

    if (tab.mode === 'reader') {
      return (
        <ReaderModeView
          url={tab.url}
          onExitReader={() => onUpdateTabInfo(tab.id, { mode: 'proxy' })}
          onNavigate={(url) => onNavigate(url, tab.id)}
        />
      );
    }

    const iframeSrc = getIframeSrc(tab.url, tab.mode);

    // Check if domain is a known strict anti-iframe walled garden
    const isKnownStrictSite =
      /instagram\.com|facebook\.com|twitter\.com|x\.com|accounts\.google\.com|netflix\.com|discord\.com\/login|threads\.net/i.test(
        tab.url
      );
    const isRestricted =
      (restrictedTabs[tab.id] || isKnownStrictSite) && !dismissedBanners[tab.id];

    // Viewport width styling
    const viewportWidthStyles: Record<DeviceViewport, string> = {
      desktop: 'w-full h-full',
      tablet: 'w-[768px] h-full shadow-2xl rounded-md border-2 border-zinc-700 my-auto mx-auto',
      mobile: 'w-[390px] h-[844px] shadow-2xl rounded-md border-2 border-zinc-700 my-auto mx-auto',
    };

    return (
      <div className="relative w-full h-full flex flex-col bg-[#09090b] overflow-hidden">
        {/* Loading Progress Bar */}
        {tab.isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 z-30 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-zinc-500 via-zinc-200 to-zinc-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Smart Compatibility Assistant Banner for Restricted / Walled Garden Sites */}
        {isRestricted && (
          <div className="relative z-20 bg-zinc-900 border-b border-amber-900/60 px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-300 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-zinc-100">{getCleanHost(tab.url)}</strong>은(는)
                보안 및 쿠키 보호 정책으로 인해 내부 iframe 내 접근/로그인을 제한합니다.
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openInPopupWindow(tab.url)}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-sm text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                title="Open in a dedicated popup window with full cookies and login"
              >
                <ExternalLink className="w-3 h-3" />
                <span>독립 팝업으로 열기</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateTabInfo(tab.id, { mode: 'reader' })}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-sm text-xs flex items-center gap-1"
                title="Try Reader Mode"
              >
                <BookOpen className="w-3 h-3" />
                <span>리더 모드</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDismissedBanners((prev) => ({ ...prev, [tab.id]: true }))
                }
                className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-sm"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport frame container */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-[#09090b] p-0 overflow-hidden">
          <div
            className={`transition-all duration-150 relative overflow-hidden flex flex-col ${
              viewportWidthStyles[tab.deviceViewport]
            }`}
            style={{
              transform: tab.zoom !== 100 ? `scale(${tab.zoom / 100})` : undefined,
              transformOrigin: 'top center',
            }}
          >
            {/* Mobile/Tablet simulated device notch */}
            {tab.deviceViewport !== 'desktop' && (
              <div className="h-5.5 bg-zinc-900 flex items-center justify-between px-3 text-[10px] text-zinc-400 select-none border-b border-zinc-800">
                <span className="font-mono">9:41</span>
                <span className="truncate max-w-[150px]">{tab.title || tab.url}</span>
                <div className="flex items-center gap-1 font-mono text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>5G</span>
                </div>
              </div>
            )}

            {/* The Web Browser IFrame */}
            <iframe
              src={iframeSrc}
              title={tab.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full flex-1 border-0 bg-white"
              onLoad={() => {
                onUpdateTabInfo(tab.id, { isLoading: false });
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex-1 w-full h-full flex overflow-hidden">
      {/* Primary Active Tab Pane */}
      <div className={`h-full overflow-hidden ${splitTab ? 'w-1/2 border-r border-zinc-800' : 'w-full'}`}>
        {renderPane(activeTab)}
      </div>

      {/* Secondary Split Screen Tab Pane */}
      {splitTab && (
        <div className="relative h-full w-1/2 overflow-hidden flex flex-col">
          {/* Split Pane Header */}
          <div className="h-6.5 bg-[#121215] border-b border-zinc-800 flex items-center justify-between px-3 text-xs text-zinc-400 select-none">
            <div className="flex items-center gap-2 truncate">
              <Columns className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate font-medium text-zinc-300">
                Split: {splitTab.title || splitTab.url}
              </span>
            </div>
            <button
              type="button"
              onClick={onCloseSplitView}
              className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xs"
              title="Close Split View"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {renderPane(splitTab, true)}
          </div>
        </div>
      )}
    </div>
  );
};
