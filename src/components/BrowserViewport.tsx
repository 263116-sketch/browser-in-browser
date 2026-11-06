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
  Sparkles,
  ZoomIn,
  ZoomOut,
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
  onOpenInAppWindow?: (url: string, title?: string) => void;
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
  onOpenInAppWindow,
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
      } else if (type === 'OMNI_BROWSER_URL_CHANGED' && url) {
        // SPA route changed (e.g. Instagram transitions to signup page in memory)
        onUpdateTabInfo(activeTab.id, {
          url,
          title: title || activeTab.title,
        });
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

  // Open URL strictly inside the website in the In-App Floating Window
  const openInInternalWindow = (url: string) => {
    if (onOpenInAppWindow) {
      onOpenInAppWindow(url, activeTab.title);
    }
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

    // Check if domain is a known strict anti-iframe walled garden or auth page
    const isInstagram = /instagram\.com/i.test(tab.url);
    const isKnownStrictSite =
      /instagram\.com|facebook\.com|twitter\.com|x\.com|accounts\.google\.com|nid\.naver\.com|accounts\.kakao\.com|netflix\.com|discord\.com\/login|threads\.net/i.test(
        tab.url
      );
    const isAuthPage = /emailsignup|signup|register|login|signin|oauth|accounts/i.test(tab.url);
    const isRestricted =
      (restrictedTabs[tab.id] || isKnownStrictSite || (isAuthPage && isInstagram)) && !dismissedBanners[tab.id];

    // Open strictly inside the web app in the In-App Floating Window
    const handleOpenInApp = () => {
      openInInternalWindow(tab.url);
    };

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

        {/* Smart Compatibility & Auth Assistant Banner for Instagram & Restricted Sites */}
        {isRestricted && (
          <div className="relative z-20 bg-zinc-900 border-b border-amber-900/60 px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs text-zinc-300 shadow-md">
            <div className="flex items-start md:items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 md:mt-0" />
              <div>
                <span className="font-semibold text-zinc-100 mr-1.5">
                  {isInstagram ? 'Instagram 회원가입 및 보안 정책 안내' : `${getCleanHost(tab.url)} 보안 제한 감지`}:
                </span>
                <span className="text-zinc-300">
                  {isInstagram
                    ? "인스타그램은 보안 쿠키 정책으로 인해 일반 웹 임베드 가입을 차단합니다. 100% 정상 작동을 위해 '웹사이트 내부 전용 창'을 이용하세요."
                    : '이 웹사이트는 보안 및 쿠키 정책으로 인해 기본 임베드 접근을 제한합니다. 웹사이트 내부 창으로 열면 정상 작동합니다.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={handleOpenInApp}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-sm text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Open inside this web app as a dedicated movable in-app window"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isInstagram ? '✨ 내부 전용 창으로 가입/로그인' : '✨ 내부 전용 창으로 열기'}</span>
              </button>

              {isInstagram && (
                <button
                  type="button"
                  onClick={() => onNavigate('https://www.instagram.com/accounts/emailsignup/?hl=ko', tab.id)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-sm text-xs flex items-center gap-1 cursor-pointer"
                  title="Reload with Korean parameter"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>새로고침</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onUpdateTabInfo(tab.id, { mode: 'reader' })}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-sm text-xs flex items-center gap-1 cursor-pointer"
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
                className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-sm cursor-pointer"
                title="닫기"
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

            {/* The Web Browser IFrame with expanded sandbox permissions */}
            <iframe
              src={iframeSrc}
              title={tab.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full flex-1 border-0 bg-white"
              onLoad={() => {
                onUpdateTabInfo(tab.id, { isLoading: false });
              }}
            />

            {/* On-Canvas Inside-Window Zoom Controller */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md rounded-md px-2 py-1 shadow-xl text-xs text-zinc-300">
              <button
                type="button"
                onClick={() => onUpdateTabInfo(tab.id, { zoom: Math.max(30, tab.zoom - 10) })}
                className="p-1 hover:text-white rounded-xs cursor-pointer"
                title="창 내부 축소 (Zoom Out)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateTabInfo(tab.id, { zoom: 100 })}
                className="text-[11px] font-mono px-1.5 hover:text-amber-400 font-semibold cursor-pointer"
                title="100% 원래 크기 복원"
              >
                {tab.zoom}%
              </button>
              <button
                type="button"
                onClick={() => onUpdateTabInfo(tab.id, { zoom: Math.min(250, tab.zoom + 10) })}
                className="p-1 hover:text-white rounded-xs cursor-pointer"
                title="창 내부 확대 (Zoom In)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Floating Quick Action Helper at bottom-right for Instagram & Auth */}
            {(isInstagram || restrictedTabs[tab.id]) && (
              <div className="absolute bottom-4 right-4 z-20 bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-md rounded-md p-3 shadow-2xl max-w-xs text-xs text-zinc-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    가입 및 로그인 오류 해결
                  </span>
                  <button
                    type="button"
                    onClick={() => setRestrictedTabs((prev) => ({ ...prev, [tab.id]: false }))}
                    className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-2.5">
                  'Page isn't available' 오류가 보이나요? 인스타그램 보안 정책상 내부 전용 창에서 가입 및 이메일 인증이 100% 정상 작동합니다.
                </p>
                <button
                  type="button"
                  onClick={handleOpenInApp}
                  className="w-full py-1.5 px-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-sm text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>웹사이트 내부 창으로 가입하기 (권장)</span>
                </button>
              </div>
            )}
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
