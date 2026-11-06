import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Home,
  Star,
  BookOpen,
  Smartphone,
  Tablet,
  Monitor,
  Cloud,
  CloudCheck,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  History,
  Bookmark as BookmarkIcon,
  Settings,
  ExternalLink,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Bookmark,
  BookmarkFolder,
  BrowserMode,
  DeviceViewport,
  HistoryItem,
  SearchEngine,
  Tab,
} from '../types/browser';
import { SEARCH_ENGINES } from '../services/browserEngines';

interface AddressBarProps {
  activeTab: Tab;
  isBookmarked: boolean;
  searchEngines: Record<string, SearchEngine>;
  selectedEngineId: string;
  folders: BookmarkFolder[];
  bookmarks: Bookmark[];
  history: HistoryItem[];
  syncStatus: { status: string; connectedDevices: number; lastSynced: number | null };
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onToggleBookmark: (tab: Tab) => void;
  onSaveBookmarkWithOptions: (title: string, url: string, folderId: string, tags: string[]) => void;
  onChangeMode: (mode: BrowserMode) => void;
  onChangeViewport: (viewport: DeviceViewport) => void;
  onChangeZoom: (delta: number) => void;
  onSelectSearchEngine: (engineId: string) => void;
  onOpenSyncModal: () => void;
  onOpenBookmarksManager: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  activeTab,
  isBookmarked,
  searchEngines,
  selectedEngineId,
  folders,
  bookmarks,
  history,
  syncStatus,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onGoHome,
  onToggleBookmark,
  onSaveBookmarkWithOptions,
  onChangeMode,
  onChangeViewport,
  onChangeZoom,
  onSelectSearchEngine,
  onOpenSyncModal,
  onOpenBookmarksManager,
  onOpenHistory,
  onOpenSettings,
}) => {
  const [inputValue, setInputValue] = useState(activeTab.url === 'omni://newtab' ? '' : activeTab.url);
  const [isFocused, setIsFocused] = useState(false);
  const [engineMenuOpen, setEngineMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [bookmarkPopoverOpen, setBookmarkPopoverOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Bookmark edit state in popover
  const [bmTitle, setBmTitle] = useState(activeTab.title);
  const [bmFolder, setBmFolder] = useState(folders[0]?.id || '');
  const [bmTags, setBmTags] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const currentEngine = searchEngines[selectedEngineId] || SEARCH_ENGINES.google;

  // Sync input value with active tab changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(activeTab.url === 'omni://newtab' ? '' : activeTab.url);
      setBmTitle(activeTab.title || activeTab.url);
    }
  }, [activeTab.url, activeTab.title, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNavigate(inputValue.trim());
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  // Suggestions from history and bookmarks matching current input
  const suggestions = isFocused && inputValue.trim().length > 1
    ? [
        ...bookmarks
          .filter(b => b.title.toLowerCase().includes(inputValue.toLowerCase()) || b.url.toLowerCase().includes(inputValue.toLowerCase()))
          .slice(0, 3)
          .map(b => ({ type: 'bookmark' as const, title: b.title, url: b.url })),
        ...history
          .filter(h => h.title.toLowerCase().includes(inputValue.toLowerCase()) || h.url.toLowerCase().includes(inputValue.toLowerCase()))
          .slice(0, 4)
          .map(h => ({ type: 'history' as const, title: h.title, url: h.url })),
      ]
    : [];

  const isHttps = activeTab.url.startsWith('https://');
  const isInternal = activeTab.url.startsWith('omni://');

  return (
    <div className="relative flex items-center gap-1.5 px-3 py-1.5 bg-[#101014] border-b border-zinc-800 text-zinc-300 z-10">
      {/* Navigation Controls: Back, Forward, Reload, Home */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onGoBack}
          disabled={!activeTab.canGoBack}
          className="p-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Back (Alt+Left)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onGoForward}
          disabled={!activeTab.canGoForward}
          className="p-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Forward (Alt+Right)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onReload}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          title={activeTab.isLoading ? 'Stop loading' : 'Reload (Ctrl+R)'}
        >
          {activeTab.isLoading ? (
            <X className="w-4 h-4 text-rose-400" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="New Tab / Home"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Omnibox Address & Search Input (Crisp rounded-md) */}
      <div className="relative flex-1">
        <form onSubmit={handleSubmit} className="flex items-center">
          <div
            className={`flex items-center w-full h-8.5 rounded-md bg-zinc-950 border transition-all px-2.5 gap-2 ${
              isFocused
                ? 'border-zinc-500 shadow-[0_0_12px_rgba(255,255,255,0.06)] ring-1 ring-zinc-600/40'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {/* Search Engine Dropdown Icon */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEngineMenuOpen(!engineMenuOpen)}
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-sm hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={`Current Search Engine: ${currentEngine.name}`}
              >
                <span>{currentEngine.icon}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>

              {/* Engine selector popup */}
              {engineMenuOpen && (
                <div className="absolute left-0 top-8 w-44 bg-zinc-900 border border-zinc-700/80 rounded-md shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    Default Search
                  </div>
                  {Object.values(searchEngines).map((engine) => (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => {
                        onSelectSearchEngine(engine.id);
                        setEngineMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-zinc-800 ${
                        engine.id === selectedEngineId ? 'text-zinc-100 font-semibold bg-zinc-800/50' : 'text-zinc-300'
                      }`}
                    >
                      <span>{engine.icon}</span>
                      <span>{engine.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Security Indicator */}
            {isInternal ? (
              <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            ) : isHttps ? (
              <span title="Secure Connection (HTTPS)">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </span>
            ) : (
              <span title="Not Secure (HTTP)">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </span>
            )}

            {/* Omnibox input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                setTimeout(() => inputRef.current?.select(), 20);
              }}
              onBlur={() => {
                setTimeout(() => setIsFocused(false), 200);
              }}
              placeholder={currentEngine.placeholder}
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />

            {/* Clear Input button */}
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  inputRef.current?.focus();
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-sm"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Mode Indicator Pill (Crisp rounded-sm, neutral titanium/graphite styling) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModeMenuOpen(!modeMenuOpen)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-sm flex items-center gap-1 uppercase tracking-wider transition-colors ${
                  activeTab.mode === 'proxy'
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    : activeTab.mode === 'reader'
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                }`}
                title="Switch browsing engine mode"
              >
                <span>{activeTab.mode}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>

              {modeMenuOpen && (
                <div className="absolute right-0 top-8 w-56 bg-zinc-900 border border-zinc-700/80 rounded-md shadow-2xl p-1.5 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeMode('proxy');
                      setModeMenuOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-sm ${
                      activeTab.mode === 'proxy' ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      Proxy Mode <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-300 px-1 py-0.2 rounded-xs">DEFAULT</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Bypasses X-Frame-Options & CSP headers so blocked sites can embed.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onChangeMode('direct');
                      setModeMenuOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-sm ${
                      activeTab.mode === 'direct' ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold">Direct Embed</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Direct native iframe. Fast for embed-friendly websites.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onChangeMode('reader');
                      setModeMenuOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-sm ${
                      activeTab.mode === 'reader' ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold">Reader Mode</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Extracts article text & images in clean distraction-free typography.
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Bookmark Star Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  onToggleBookmark(activeTab);
                  if (!isBookmarked) {
                    setBookmarkPopoverOpen(true);
                  }
                }}
                className={`p-1 rounded-sm transition-all ${
                  isBookmarked
                    ? 'text-amber-400 hover:text-amber-300 fill-amber-400'
                    : 'text-zinc-500 hover:text-amber-400'
                }`}
                title={isBookmarked ? 'Edit bookmark' : 'Bookmark this tab'}
              >
                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>

              {/* Bookmark Options Popover */}
              {bookmarkPopoverOpen && (
                <div className="absolute right-0 top-8 w-72 bg-zinc-900 border border-zinc-700/80 rounded-md shadow-2xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Bookmark Saved
                    </span>
                    <button
                      type="button"
                      onClick={() => setBookmarkPopoverOpen(false)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Name</label>
                      <input
                        type="text"
                        value={bmTitle}
                        onChange={(e) => setBmTitle(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Folder</label>
                      <select
                        value={bmFolder}
                        onChange={(e) => setBmFolder(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
                      >
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Tags (comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. news, tech, favorite"
                        value={bmTags}
                        onChange={(e) => setBmTags(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const tagList = bmTags.split(',').map(t => t.trim()).filter(Boolean);
                          onSaveBookmarkWithOptions(bmTitle, activeTab.url, bmFolder, tagList);
                          setBookmarkPopoverOpen(false);
                        }}
                        className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded-sm font-semibold text-xs transition-colors shadow-sm"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Omnibox Autocomplete Dropdown */}
        {suggestions.length > 0 && isFocused && (
          <div className="absolute left-0 right-0 top-10 bg-zinc-900 border border-zinc-700/80 rounded-md shadow-2xl p-1.5 z-50">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Suggestions & Bookmarks
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={() => {
                  onNavigate(item.url);
                  setIsFocused(false);
                }}
                className="flex items-center gap-2 p-2 rounded-sm hover:bg-zinc-800 cursor-pointer text-xs group"
              >
                {item.type === 'bookmark' ? (
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                ) : (
                  <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <div className="flex-1 truncate">
                  <span className="text-zinc-200 group-hover:text-zinc-100 font-medium">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-zinc-500 ml-2 truncate">
                    {item.url}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Browser Tools: Reader Mode, Viewport, Zoom, Sync, Menu */}
      <div className="flex items-center gap-1">
        {/* Reader Mode Toggle */}
        <button
          type="button"
          onClick={() => onChangeMode(activeTab.mode === 'reader' ? 'proxy' : 'reader')}
          className={`p-1.5 rounded-md transition-colors ${
            activeTab.mode === 'reader'
              ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60'
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Distraction-free Reader Mode"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Quick Open in Dedicated Popup Window (for Instagram, Google Login, Anti-iframe sites) */}
        <button
          type="button"
          onClick={() => {
            if (activeTab.url && activeTab.url !== 'omni://newtab') {
              window.open(activeTab.url, '_blank', 'width=1150,height=850,resizable=yes,scrollbars=yes');
            }
          }}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="독립 팝업 창으로 열기 (Instagram, Google 로그인 등 외부 보안 사이트)"
        >
          <ExternalLink className="w-4 h-4" />
        </button>

        {/* Viewport switcher: Desktop / Tablet / Mobile */}
        <div className="flex items-center bg-zinc-950 rounded-md p-0.5 border border-zinc-800">
          <button
            type="button"
            onClick={() => onChangeViewport('desktop')}
            className={`p-1 rounded-sm ${
              activeTab.deviceViewport === 'desktop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Desktop Viewport"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeViewport('tablet')}
            className={`p-1 rounded-sm ${
              activeTab.deviceViewport === 'tablet' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Tablet Viewport (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeViewport('mobile')}
            className={`p-1 rounded-sm ${
              activeTab.deviceViewport === 'mobile' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Mobile Viewport (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 text-xs text-zinc-400 bg-zinc-950 px-1 py-0.5 rounded-md border border-zinc-800">
          <button
            type="button"
            onClick={() => onChangeZoom(-10)}
            className="p-1 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono px-0.5">{activeTab.zoom}%</span>
          <button
            type="button"
            onClick={() => onChangeZoom(10)}
            className="p-1 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* Cross-Device Cloud Sync Button */}
        <button
          type="button"
          onClick={onOpenSyncModal}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors"
          title="Cross-Device Cloud Sync Center"
        >
          <Cloud className={`w-3.5 h-3.5 ${syncStatus.status === 'synced' ? 'text-emerald-400' : 'text-zinc-400'}`} />
          <span className="text-[11px] font-medium hidden sm:inline text-zinc-300">
            {syncStatus.status === 'synced' ? 'Sync On' : 'Sync'}
          </span>
          {syncStatus.connectedDevices > 1 && (
            <span className="text-[10px] px-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-sm font-bold">
              {syncStatus.connectedDevices}
            </span>
          )}
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`p-1.5 rounded-md transition-colors ${
              moreMenuOpen ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Browser Menu"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {moreMenuOpen && (
            <div className="absolute right-0 top-8.5 w-52 bg-zinc-900 border border-zinc-700/80 rounded-md shadow-2xl p-1.5 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenBookmarksManager();
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm hover:bg-zinc-800 text-zinc-200 text-left"
              >
                <BookmarkIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Bookmarks Manager</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenHistory();
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm hover:bg-zinc-800 text-zinc-200 text-left"
              >
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span>Browsing History</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenSyncModal();
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm hover:bg-zinc-800 text-zinc-200 text-left"
              >
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cross-Device Sync Hub</span>
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <a
                href={activeTab.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMoreMenuOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-sm hover:bg-zinc-800 text-zinc-200 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Open in Real Window</span>
                </div>
              </a>

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm hover:bg-zinc-800 text-zinc-200 text-left"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Browser Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
