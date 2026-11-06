import React, { useState } from 'react';
import {
  X,
  History,
  Trash2,
  ExternalLink,
  Search,
  Globe,
  Calendar,
} from 'lucide-react';
import { HistoryItem } from '../types/browser';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  onNewTab: (url: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onNavigate,
  onNewTab,
  onDeleteHistoryItem,
  onClearAllHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      h.title.toLowerCase().includes(q) ||
      h.url.toLowerCase().includes(q) ||
      (h.device && h.device.toLowerCase().includes(q))
    );
  });

  // Group by date: Today, Yesterday, Older
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  const groups = {
    today: [] as HistoryItem[],
    yesterday: [] as HistoryItem[],
    older: [] as HistoryItem[],
  };

  filteredHistory.forEach((item) => {
    if (item.visitedAt >= startOfToday) {
      groups.today.push(item);
    } else if (item.visitedAt >= startOfYesterday) {
      groups.yesterday.push(item);
    } else {
      groups.older.push(item);
    }
  });

  const renderGroup = (title: string, items: HistoryItem[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="mb-5">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {title} ({items.length})
          </span>
        </div>

        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between p-2 rounded-md bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all text-xs"
            >
              <div
                onClick={() => {
                  onNavigate(item.url);
                  onClose();
                }}
                className="flex items-center gap-2.5 flex-1 truncate cursor-pointer mr-2"
              >
                {item.favicon ? (
                  <img
                    src={item.favicon}
                    alt=""
                    className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-medium text-zinc-200 group-hover:text-white truncate">
                    {item.title || item.url}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 truncate">
                    <span>{item.url}</span>
                    {item.device && (
                      <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1 py-0.2 rounded-xs">
                        {item.device}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    onNewTab(item.url);
                    onClose();
                  }}
                  className="p-1 rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteHistoryItem(item.id)}
                  className="p-1 rounded-sm text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                  title="Delete from history"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl h-[580px] bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#0d0d10]">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-zinc-300" />
            <div>
              <h3 className="text-sm font-semibold text-white">Browsing History</h3>
              <p className="text-[11px] text-zinc-400">
                {history.length} visited pages synced across devices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear entire browsing history?')) {
                    onClearAllHistory();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-md text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-950/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search history by title, URL, or device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8.5 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Grouped History List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-xs italic">
              No browsing history matches your search.
            </div>
          ) : (
            <>
              {renderGroup('Today', groups.today)}
              {renderGroup('Yesterday', groups.yesterday)}
              {renderGroup('Earlier', groups.older)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
