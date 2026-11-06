import React, { useState } from 'react';
import {
  Plus,
  X,
  Pin,
  Columns,
  Search,
  Globe,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Tab } from '../types/browser';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  splitTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: (url?: string) => void;
  onTogglePinTab: (id: string) => void;
  onToggleSplitView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  splitTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onTogglePinTab,
  onToggleSplitView,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState('');

  const filteredTabs = tabSearchQuery.trim()
    ? tabs.filter(
        t =>
          t.title.toLowerCase().includes(tabSearchQuery.toLowerCase()) ||
          t.url.toLowerCase().includes(tabSearchQuery.toLowerCase())
      )
    : tabs;

  return (
    <div className="flex items-center h-10.5 bg-[#0b0b0e] border-b border-zinc-800/90 px-2 select-none gap-1 overflow-hidden z-20">
      {/* Decorative window controls */}
      <div className="flex items-center gap-1.5 px-2 mr-1">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 hover:bg-rose-500 cursor-pointer transition-colors" title="Close window" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 hover:bg-amber-500 cursor-pointer transition-colors" title="Minimize" />
        <span
          className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 cursor-pointer transition-colors"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen"
        />
      </div>

      {/* Tabs scrollable list */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isSplit = tab.id === splitTabId;
          const isNewTab = tab.url === 'omni://newtab';

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 h-7.5 px-2.5 rounded-t-md text-xs font-medium cursor-pointer transition-all border-t border-x duration-100 max-w-[190px] min-w-[100px] shrink-0 ${
                isActive
                  ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-xs'
                  : isSplit
                  ? 'bg-zinc-800/50 border-purple-800/40 text-purple-200'
                  : 'bg-transparent hover:bg-zinc-900/50 border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Favicon or Loading spinner */}
              {tab.isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300 shrink-0" />
              ) : tab.favicon && !isNewTab ? (
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`} />
              )}

              {/* Title */}
              <span className="truncate flex-1">
                {isNewTab ? 'New Tab' : tab.title || tab.url}
              </span>

              {/* Pin indicator */}
              {tab.isPinned && (
                <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0 fill-amber-400" />
              )}

              {/* Split view indicator */}
              {isSplit && (
                <span className="px-1 py-0.2 text-[9px] font-bold bg-purple-500/20 text-purple-300 rounded-sm border border-purple-500/30">
                  SPLIT
                </span>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded-sm hover:bg-zinc-800 hover:text-white shrink-0 transition-opacity ${
                  isActive ? 'opacity-100 text-zinc-400' : 'opacity-0 group-hover:opacity-100 text-zinc-500'
                }`}
                title="Close Tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Plus / New tab button */}
        <button
          type="button"
          onClick={() => onNewTab()}
          className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
          title="New Tab (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 pl-1">
        {/* Split View Toggle */}
        <button
          type="button"
          onClick={onToggleSplitView}
          className={`p-1.5 rounded-md transition-colors ${
            splitTabId
              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title={splitTabId ? 'Exit Split View' : 'Split View with another tab'}
        >
          <Columns className="w-3.5 h-3.5" />
        </button>

        {/* Tab Search */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className={`p-1.5 rounded-md transition-colors ${
              searchOpen ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search Tabs"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {searchOpen && (
            <div className="absolute right-0 top-8.5 w-64 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl p-2 z-50">
              <input
                type="text"
                autoFocus
                placeholder="Search open tabs..."
                value={tabSearchQuery}
                onChange={(e) => setTabSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 mb-2"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredTabs.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTab(t.id);
                      setSearchOpen(false);
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer ${
                      t.id === activeTabId ? 'bg-zinc-800 text-zinc-100 font-medium' : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate flex-1">{t.title || t.url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
