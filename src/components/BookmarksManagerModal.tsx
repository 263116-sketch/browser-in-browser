import React, { useState } from 'react';
import {
  X,
  Star,
  Folder,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Search,
  Globe,
  FolderPlus,
  Check,
} from 'lucide-react';
import { Bookmark, BookmarkFolder } from '../types/browser';

interface BookmarksManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onNavigate: (url: string) => void;
  onNewTab: (url: string) => void;
  onSaveBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onCreateFolder: (name: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
}

export const BookmarksManagerModal: React.FC<BookmarksManagerModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  folders,
  onNavigate,
  onNewTab,
  onSaveBookmark,
  onDeleteBookmark,
  onCreateFolder,
  onDeleteFolder,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // New folder input
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#71717a');

  // Bookmark form state
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formFolderId, setFormFolderId] = useState(folders[0]?.id || '');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');

  if (!isOpen) return null;

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter((bm) => {
    const matchesFolder = selectedFolderId === null || bm.folderId === selectedFolderId;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      bm.title.toLowerCase().includes(q) ||
      bm.url.toLowerCase().includes(q) ||
      (bm.tags && bm.tags.some((t) => t.toLowerCase().includes(q)));
    return matchesFolder && matchesQuery;
  });

  const startEdit = (bm: Bookmark) => {
    setEditingBookmark(bm);
    setIsCreatingNew(false);
    setFormTitle(bm.title);
    setFormUrl(bm.url);
    setFormFolderId(bm.folderId || folders[0]?.id || '');
    setFormTags((bm.tags || []).join(', '));
    setFormNotes(bm.notes || '');
  };

  const startCreate = () => {
    setIsCreatingNew(true);
    setEditingBookmark(null);
    setFormTitle('');
    setFormUrl('https://');
    setFormFolderId(selectedFolderId || folders[0]?.id || '');
    setFormTags('');
    setFormNotes('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUrl.trim()) return;

    let targetUrl = formUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const tagList = formTags.split(',').map((t) => t.trim()).filter(Boolean);

    const updated: Bookmark = {
      id: editingBookmark ? editingBookmark.id : 'bm-' + Math.random().toString(36).substring(2, 9),
      title: formTitle.trim(),
      url: targetUrl,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=64`,
      folderId: formFolderId,
      tags: tagList,
      notes: formNotes.trim(),
      createdAt: editingBookmark ? editingBookmark.createdAt : Date.now(),
    };

    onSaveBookmark(updated);
    setEditingBookmark(null);
    setIsCreatingNew(false);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const folderColors = ['#a1a1aa', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[580px] bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#0d0d10]">
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h3 className="text-sm font-semibold text-white">Bookmarks Manager</h3>
            <span className="text-[11px] px-2 py-0.2 rounded-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
              {bookmarks.length} Total
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bookmark</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Folders Sidebar */}
          <div className="w-56 bg-zinc-950 border-r border-zinc-800 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Folders
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-sm hover:bg-zinc-800"
                title="Create Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* New folder mini form */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="mb-2 p-2 bg-zinc-900 border border-zinc-750 rounded-md">
                <input
                  type="text"
                  autoFocus
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-zinc-200 mb-1.5 focus:outline-none focus:border-zinc-500"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {folderColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-3.5 h-3.5 rounded-full ${newFolderColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button type="submit" className="p-1 bg-zinc-100 text-zinc-950 rounded-sm">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-0.5 overflow-y-auto flex-1">
              {/* All Bookmarks */}
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  selectedFolderId === null
                    ? 'bg-zinc-800 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>All Bookmarks</span>
                </div>
                <span className="text-[10px] text-zinc-500">{bookmarks.length}</span>
              </button>

              {/* Folders */}
              {folders.map((f) => {
                const count = bookmarks.filter((b) => b.folderId === f.id).length;
                const isSelected = selectedFolderId === f.id;
                return (
                  <div
                    key={f.id}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                    onClick={() => setSelectedFolderId(f.id)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-3.5 h-3.5" style={{ color: f.color || '#a1a1aa' }} />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">{count}</span>
                      {f.id !== 'folder-favorites' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete folder "${f.name}"?`)) onDeleteFolder(f.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 rounded-xs"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bookmarks List & Editor */}
          <div className="flex-1 flex flex-col bg-zinc-900/40 overflow-hidden">
            {/* Search Bar */}
            <div className="p-2.5 border-b border-zinc-800 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search bookmarks by title, URL, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* List / Edit view */}
            {isCreatingNew || editingBookmark ? (
              /* Edit Form */
              <form onSubmit={handleSaveForm} className="p-5 overflow-y-auto space-y-3.5 max-w-lg">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {editingBookmark ? 'Edit Bookmark' : 'Add New Bookmark'}
                </h4>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Page Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">URL</label>
                  <input
                    type="text"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Folder</label>
                    <select
                      value={formFolderId}
                      onChange={(e) => setFormFolderId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. dev, reference"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Personal Notes (optional)</label>
                  <textarea
                    rows={2.5}
                    placeholder="Notes or reference info..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold shadow-sm"
                  >
                    Save Bookmark
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBookmark(null);
                      setIsCreatingNew(false);
                    }}
                    className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Bookmarks List */
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredBookmarks.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 text-xs italic">
                    No bookmarks found. Click "Add Bookmark" to create one.
                  </div>
                ) : (
                  filteredBookmarks.map((bm) => {
                    const folder = folders.find((f) => f.id === bm.folderId);
                    return (
                      <div
                        key={bm.id}
                        className="group flex items-center justify-between p-2 rounded-md bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all text-xs"
                      >
                        <div
                          onClick={() => {
                            onNavigate(bm.url);
                            onClose();
                          }}
                          className="flex items-center gap-2.5 flex-1 truncate cursor-pointer mr-2"
                        >
                          {bm.favicon ? (
                            <img
                              src={bm.favicon}
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
                              {bm.title}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">{bm.url}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {folder && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded-xs font-medium border"
                              style={{
                                borderColor: `${folder.color}40`,
                                color: folder.color,
                              }}
                            >
                              {folder.name}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onNewTab(bm.url);
                              onClose();
                            }}
                            className="p-1 rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-800"
                            title="Open in New Tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => startEdit(bm)}
                            className="p-1 rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-800"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteBookmark(bm.id)}
                            className="p-1 rounded-sm text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
