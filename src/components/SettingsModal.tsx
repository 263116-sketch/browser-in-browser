import React, { useState } from 'react';
import {
  X,
  Settings,
  Search,
  Shield,
  Laptop,
  RotateCcw,
  Check,
} from 'lucide-react';
import { BrowserSettings, SearchEngine } from '../types/browser';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  searchEngines: Record<string, SearchEngine>;
  onUpdateSettings: (newSettings: BrowserSettings) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  searchEngines,
  onUpdateSettings,
  onResetAllData,
}) => {
  const [formSettings, setFormSettings] = useState<BrowserSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#0d0d10]">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Browser Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {/* Default Search Engine */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2 mb-1.5">
              <Search className="w-4 h-4 text-zinc-400" /> Default Search Engine
            </label>
            <select
              value={formSettings.defaultSearchEngine}
              onChange={(e) =>
                setFormSettings({ ...formSettings, defaultSearchEngine: e.target.value })
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              {Object.values(searchEngines).map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.icon} {eng.name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Browsing Mode */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-zinc-400" /> Default Web Engine Mode
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, defaultMode: 'proxy' })}
                className={`p-3 rounded-md border text-left transition-all ${
                  formSettings.defaultMode === 'proxy'
                    ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-zinc-200">Proxy Engine (Recommended)</div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Bypasses iframe blockers (X-Frame-Options & CSP).
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, defaultMode: 'direct' })}
                className={`p-3 rounded-md border text-left transition-all ${
                  formSettings.defaultMode === 'direct'
                    ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-zinc-200">Direct Embed</div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  Standard native iframe loading for embed-friendly websites.
                </div>
              </button>
            </div>
          </div>

          {/* Bookmarks Bar Visibility */}
          <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950 border border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-200">Show Bookmarks Bar</div>
              <div className="text-[10px] text-zinc-500">
                Display quick bookmarks toolbar beneath the address bar.
              </div>
            </div>
            <input
              type="checkbox"
              checked={formSettings.showBookmarksBar}
              onChange={(e) =>
                setFormSettings({ ...formSettings, showBookmarksBar: e.target.checked })
              }
              className="w-4 h-4 accent-zinc-200 rounded-sm cursor-pointer"
            />
          </div>

          {/* Custom Device Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2 mb-1.5">
              <Laptop className="w-4 h-4 text-zinc-400" /> Device Name in Cloud Sync
            </label>
            <input
              type="text"
              value={formSettings.deviceName}
              onChange={(e) => setFormSettings({ ...formSettings, deviceName: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Shown to your other synced phones and tablets.
            </p>
          </div>

          {/* Reset All Data */}
          <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Reset local browser cache & settings</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset all browser bookmarks, history, and settings to defaults?')) {
                  onResetAllData();
                  onClose();
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Browser</span>
            </button>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors shadow-sm"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedSuccess ? 'Saved' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
