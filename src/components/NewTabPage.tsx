import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Globe,
  Clock,
  Bookmark as BookmarkIcon,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Laptop,
  Smartphone,
  Cloud,
  ChevronRight,
  History as HistoryIcon,
} from 'lucide-react';
import { Bookmark, HistoryItem, SearchEngine } from '../types/browser';
import { SPEED_DIAL_SHORTCUTS, SEARCH_ENGINES } from '../services/browserEngines';

interface NewTabPageProps {
  bookmarks: Bookmark[];
  history: HistoryItem[];
  searchEngines: Record<string, SearchEngine>;
  selectedEngineId: string;
  syncKey: string;
  onNavigate: (url: string) => void;
  onSelectSearchEngine: (id: string) => void;
  onOpenSyncModal: () => void;
}

export const NewTabPage: React.FC<NewTabPageProps> = ({
  bookmarks,
  history,
  searchEngines,
  selectedEngineId,
  syncKey,
  onNavigate,
  onSelectSearchEngine,
  onOpenSyncModal,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Mouse position for interactive luminescence spotlight
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const currentEngine = searchEngines[selectedEngineId] || SEARCH_ENGINES.google;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onNavigate(query.trim());
  };

  const categories = ['All', 'Dev', 'News', 'Reference', 'Search', 'Science'];

  const filteredShortcuts =
    activeCategory === 'All'
      ? SPEED_DIAL_SHORTCUTS
      : SPEED_DIAL_SHORTCUTS.filter((s) => s.category === activeCategory);

  const recentHistory = history.slice(0, 6);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-full w-full bg-[#09090b] text-zinc-100 flex flex-col items-center p-6 md:p-12 overflow-y-auto selection:bg-zinc-700 selection:text-white"
    >
      {/* 1. Interactive Mouse-Following Luminescent Spotlight Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ease-out"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.055), rgba(160, 160, 190, 0.015) 45%, transparent 75%)`,
        }}
      />

      {/* Subtle fine geometric grid pattern that catches the light */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.12) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 80%)`,
        }}
      />

      {/* Main Content (Z-indexed above spotlight) */}
      <div className="relative z-10 w-full flex flex-col items-center max-w-4xl">
        {/* Top Ambient Clock */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-extralight tracking-tight text-zinc-100 font-sans">
            {timeStr || '12:00'}
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mt-2 font-medium">
            {dateStr}
          </p>
        </div>

        {/* Central Search Form (Crisp geometric corners) */}
        <div className="w-full max-w-2xl mb-8">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <div className="flex items-center w-full h-13 rounded-lg bg-zinc-900/90 border border-zinc-800 shadow-xl px-4 gap-3 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-700/50 transition-all backdrop-blur-md">
              <span className="text-lg opacity-80">{currentEngine.icon}</span>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${currentEngine.name} or type web address...`}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
              {query && (
                <button
                  type="submit"
                  className="p-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-sm"
                  title="Search"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Engine switcher quick tabs (crisp rounded-md) */}
          <div className="flex items-center justify-center gap-1.5 mt-3 overflow-x-auto py-1">
            {Object.values(searchEngines).map((eng) => (
              <button
                key={eng.id}
                type="button"
                onClick={() => onSelectSearchEngine(eng.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                  eng.id === selectedEngineId
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 font-medium'
                    : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <span>{eng.icon}</span>
                <span>{eng.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cloud Sync Callout Banner (Titanium / Graphite dark style, crisp rounded-lg) */}
        <div className="w-full mb-8 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-300 shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                Cross-Device Cloud Sync
                <span className="font-mono text-[10px] bg-zinc-950 px-2 py-0.5 rounded-sm text-zinc-300 border border-zinc-800">
                  {syncKey}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Sync history and bookmarks across your phone, tablet, and computer using this vault key or QR code.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Sync Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Dial Section */}
        <div className="w-full mb-10">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Speed Dial & Top Sites
              </h2>
            </div>

            {/* Category Filter Pills (Crisp rounded-md) */}
            <div className="flex items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    activeCategory === cat
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts Grid (Crisp rounded-lg with subtle light-responsive borders) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {filteredShortcuts.map((item) => (
              <div
                key={item.url}
                onClick={() => onNavigate(item.url)}
                className="group relative flex flex-col p-3 rounded-lg bg-zinc-900/70 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-600 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-xs border border-zinc-700/60 shadow-inner"
                    style={{ backgroundColor: item.color }}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=64`}
                      alt=""
                      className="w-4 h-4 rounded-xs object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider group-hover:text-zinc-400">
                    {item.category}
                  </span>
                </div>
                <span className="font-medium text-xs text-zinc-200 group-hover:text-white truncate">
                  {item.title}
                </span>
                <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent History & Bookmarks Two Columns (Crisp rounded-lg) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent History */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <HistoryIcon className="w-3.5 h-3.5 text-zinc-400" /> Recent History
              </span>
              <span className="text-[11px] text-zinc-500">{history.length} items</span>
            </div>

            {recentHistory.length === 0 ? (
              <div className="text-xs text-zinc-500 italic py-4 text-center">
                No recent visits yet. Browse websites to populate history.
              </div>
            ) : (
              <div className="space-y-1">
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.url)}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-800/80 cursor-pointer text-xs group transition-colors border border-transparent hover:border-zinc-700/60"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2 flex-1">
                      {item.favicon ? (
                        <img
                          src={item.favicon}
                          alt=""
                          className="w-3.5 h-3.5 rounded-xs object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span className="truncate text-zinc-300 group-hover:text-zinc-100 font-medium">
                        {item.title || item.url}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                      {new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Bookmarks */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <BookmarkIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" /> Saved Bookmarks
              </span>
              <span className="text-[11px] text-zinc-500">{bookmarks.length} saved</span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="text-xs text-zinc-500 italic py-4 text-center">
                No bookmarks saved yet. Click the star icon in the address bar to bookmark any site.
              </div>
            ) : (
              <div className="space-y-1">
                {bookmarks.slice(0, 6).map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => onNavigate(bm.url)}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-800/80 cursor-pointer text-xs group transition-colors border border-transparent hover:border-zinc-700/60"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2 flex-1">
                      {bm.favicon ? (
                        <img
                          src={bm.favicon}
                          alt=""
                          className="w-3.5 h-3.5 rounded-xs object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span className="truncate text-zinc-300 group-hover:text-zinc-100 font-medium">
                        {bm.title}
                      </span>
                    </div>
                    {bm.tags && bm.tags.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                        {bm.tags[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
