import React, { useState } from 'react';
import {
  Folder,
  Globe,
  Plus,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Bookmark, BookmarkFolder } from '../types/browser';

interface BookmarksBarProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onNavigate: (url: string) => void;
  onOpenBookmarksManager: () => void;
  onDeleteBookmark: (id: string) => void;
}

export const BookmarksBar: React.FC<BookmarksBarProps> = ({
  bookmarks,
  folders,
  onNavigate,
  onOpenBookmarksManager,
  onDeleteBookmark,
}) => {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  return (
    <div className="flex items-center h-7.5 bg-[#0e0e12] border-b border-zinc-800/80 px-3 text-xs text-zinc-300 gap-1.5 overflow-x-auto no-scrollbar select-none z-10">
      {/* Folder items */}
      {folders.map((folder) => {
        const folderBms = bookmarks.filter((b) => b.folderId === folder.id);
        const isOpen = openFolderId === folder.id;

        return (
          <div key={folder.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenFolderId(isOpen ? null : folder.id)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm transition-colors hover:bg-zinc-800/80 ${
                isOpen ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-300'
              }`}
            >
              <Folder
                className="w-3.5 h-3.5"
                style={{ color: folder.color || '#a1a1aa' }}
              />
              <span className="font-medium truncate max-w-[120px]">{folder.name}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Folder Dropdown (Crisp rounded-md) */}
            {isOpen && (
              <div className="absolute left-0 top-6.5 w-56 bg-zinc-900 border border-zinc-700/80 rounded-md shadow-2xl py-1 z-50">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800 flex items-center justify-between">
                  <span>{folder.name}</span>
                  <span>{folderBms.length} items</span>
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {folderBms.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-zinc-500 italic">Folder is empty</div>
                  ) : (
                    folderBms.map((bm) => (
                      <div
                        key={bm.id}
                        onClick={() => {
                          onNavigate(bm.url);
                          setOpenFolderId(null);
                        }}
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-xs group"
                      >
                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                          {bm.favicon ? (
                            <img src={bm.favicon} alt="" className="w-3.5 h-3.5 rounded-xs object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-zinc-500" />
                          )}
                          <span className="truncate text-zinc-200 group-hover:text-zinc-100">{bm.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBookmark(bm.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 rounded-xs"
                          title="Delete bookmark"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="h-3 w-px bg-zinc-800 mx-1 shrink-0" />

      {/* Direct Bookmarks */}
      {bookmarks.slice(0, 10).map((bm) => (
        <div
          key={bm.id}
          onClick={() => onNavigate(bm.url)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 cursor-pointer transition-colors max-w-[150px] shrink-0"
          title={`${bm.title} - ${bm.url}`}
        >
          {bm.favicon ? (
            <img
              src={bm.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          )}
          <span className="truncate font-medium">{bm.title}</span>
        </div>
      ))}

      {/* Open Manager Button */}
      <button
        type="button"
        onClick={onOpenBookmarksManager}
        className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-sm transition-colors shrink-0 text-[11px]"
        title="Manage all bookmarks"
      >
        <Plus className="w-3 h-3" />
        <span>Manage</span>
      </button>
    </div>
  );
};
