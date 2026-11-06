import React, { useState } from 'react';
import {
  X,
  Cloud,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Laptop,
  Download,
  Upload,
  Key,
  Trash2,
  Share2,
} from 'lucide-react';
import { generateQrSvg } from '../services/qrGenerator';
import { Bookmark, BookmarkFolder, HistoryItem, SyncDevice } from '../types/browser';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncKey: string;
  onUpdateSyncKey: (newKey: string) => void;
  onTriggerSync: () => Promise<void>;
  syncStatus: {
    status: string;
    lastSynced: number | null;
    connectedDevices: number;
    error?: string;
  };
  currentDeviceName: string;
  devices: SyncDevice[];
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  history: HistoryItem[];
  onImportBackup: (data: any) => void;
  onClearCloudData: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncKey,
  onUpdateSyncKey,
  onTriggerSync,
  syncStatus,
  currentDeviceName,
  devices,
  bookmarks,
  folders,
  history,
  onImportBackup,
  onClearCloudData,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'key' | 'backup'>('qr');

  if (!isOpen) return null;

  // Pairing URL containing sync key
  const pairUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(syncKey)}`
    : `https://browser.app/?sync=${syncKey}`;

  const qrSvg = generateQrSvg(pairUrl, 190);

  const copySyncKey = () => {
    navigator.clipboard.writeText(syncKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyPairLink = () => {
    navigator.clipboard.writeText(pairUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    onUpdateSyncKey(inputKey.trim().toUpperCase());
    setInputKey('');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onTriggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      syncKey,
      bookmarks,
      folders,
      history,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnibrowser-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        onImportBackup(parsed);
      } catch (err) {
        alert('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#0d0d10]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Cross-Device Cloud Sync
                <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-mono">
                  ACTIVE
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Sync history, bookmarks, and open tabs across devices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Key Status Card (Crisp rounded-md) */}
        <div className="p-5 pb-3">
          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                <Key className="w-3 h-3 text-zinc-400" /> Private Sync Vault Key
              </div>
              <div className="text-base font-mono font-bold text-zinc-100 tracking-wider mt-0.5 select-all">
                {syncKey}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Last synced:{' '}
                {syncStatus.lastSynced
                  ? new Date(syncStatus.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Just now'}
              </div>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={copySyncKey}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Crisp underline style) */}
        <div className="flex items-center border-b border-zinc-800 px-5 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'qr'
                ? 'border-zinc-300 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pair Phone (QR)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('key')}
            className={`pb-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'key'
                ? 'border-zinc-300 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Connect Another Device</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'backup'
                ? 'border-zinc-300 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup & Export</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto max-h-[360px]">
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center">
              <div
                className="p-2 bg-zinc-950 border border-zinc-800 rounded-md shadow-inner mb-3"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-xs text-zinc-200 font-medium">
                Scan with your phone's camera
              </p>
              <p className="text-[11px] text-zinc-400 max-w-xs mt-0.5 mb-3">
                Instantly opens OmniBrowser on your phone with the exact same bookmarks and history.
              </p>

              <button
                type="button"
                onClick={copyPairLink}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-medium text-zinc-200 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Mobile Pairing Link'}</span>
              </button>
            </div>
          )}

          {activeTab === 'key' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Enter Existing Sync Vault Key
                </label>
                <form onSubmit={handleJoinKey} className="flex gap-2">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                    placeholder="e.g. ORBIT-CORE-4819"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-200 uppercase tracking-wider focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold transition-colors shadow-sm"
                  >
                    Join Vault
                  </button>
                </form>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Enter the key from your other device to merge and synchronize all data.
                </p>
              </div>

              {/* Connected Devices */}
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 block mb-2">
                  Active Devices in this Vault ({devices.length || 1})
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Laptop className="w-3.5 h-3.5 text-zinc-300" />
                      <div>
                        <div className="font-medium text-zinc-200 flex items-center gap-2">
                          {currentDeviceName}
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1 py-0.2 rounded-xs font-mono">
                            THIS DEVICE
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500">Connected now</div>
                      </div>
                    </div>
                  </div>

                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2 rounded-md bg-zinc-950/60 border border-zinc-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                        <div>
                          <div className="font-medium text-zinc-300">{d.name}</div>
                          <div className="text-[10px] text-zinc-500">
                            Last seen: {new Date(d.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Export Offline Backup</div>
                  <div className="text-[11px] text-zinc-500">
                    Save all bookmarks and history to a JSON file.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-medium text-zinc-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Restore from Backup</div>
                  <div className="text-[11px] text-zinc-500">
                    Import bookmarks and history from JSON backup.
                  </div>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-xs font-medium text-zinc-200 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleFileInput} className="hidden" />
                </label>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
                <span className="text-zinc-500">Reset cloud sync data</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear cloud data for this sync key?')) {
                      onClearCloudData();
                    }
                  }}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Cloud Vault</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
