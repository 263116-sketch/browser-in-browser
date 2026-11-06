import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minus,
  Square,
  RotateCw,
  Smartphone,
  Monitor,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { getIframeSrc, getCleanHost } from '../services/browserEngines';

interface InAppFloatingWindowProps {
  isOpen: boolean;
  url: string;
  title?: string;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

export const InAppFloatingWindow: React.FC<InAppFloatingWindowProps> = ({
  isOpen,
  url,
  title = 'Instagram 전용 내부 창',
  onClose,
  onNavigate,
}) => {
  const [currentUrl, setCurrentUrl] = useState(url || 'https://www.instagram.com/accounts/emailsignup/');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  // Floating window position and size state
  const [position, setPosition] = useState({ x: 80, y: 50 });
  const [size, setSize] = useState({ width: 520, height: 720 });

  // Dragging and Resizing refs
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  // Sync with prop URL
  useEffect(() => {
    if (url) {
      setCurrentUrl(url);
      setIsLoading(true);
    }
  }, [url]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(250, prev + 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(30, prev - 10));
  const handleResetZoom = () => setZoom(100);

  // Handle Dragging
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (isMaximized || (e.target as HTMLElement).closest('button, input')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  };

  // Handle Resizing
  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (isMaximized) return;
    isResizingRef.current = true;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartRef.current.mouseX;
        const deltaY = e.clientY - dragStartRef.current.mouseY;
        const newX = Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.posX + deltaX));
        const newY = Math.max(40, Math.min(window.innerHeight - 150, dragStartRef.current.posY + deltaY));
        setPosition({ x: newX, y: newY });
      }

      if (isResizingRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;
        const newW = Math.max(380, Math.min(window.innerWidth - 40, resizeStartRef.current.width + deltaX));
        const newH = Math.max(460, Math.min(window.innerHeight - 80, resizeStartRef.current.height + deltaY));
        setSize({ width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isOpen) return null;

  const isInstagram = /instagram\.com/i.test(currentUrl);
  const iframeSrc = getIframeSrc(currentUrl, 'proxy');

  // If Minimized: Show stylish floating dock pill
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2 bg-zinc-900/95 border border-zinc-700/80 rounded-md shadow-2xl cursor-pointer hover:bg-zinc-800 text-zinc-100 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-semibold">{isInstagram ? 'Instagram (내부 창 최소화됨)' : title}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-0.5 hover:text-rose-400 text-zinc-400 rounded-sm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Positioning style
  const containerStyle: React.CSSProperties = isMaximized
    ? {
        position: 'fixed',
        top: '42px',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100vh - 42px)',
        zIndex: 45,
      }
    : {
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 45,
      };

  return (
    <div
      style={containerStyle}
      className="flex flex-col bg-[#09090b] border border-zinc-700/90 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
    >
      {/* 1. Window Header (Draggable Titlebar) */}
      <div
        onMouseDown={handleMouseDownHeader}
        className="h-9 bg-[#121215] border-b border-zinc-800 flex items-center justify-between px-3 cursor-move text-zinc-300"
      >
        {/* Left: App Identity */}
        <div className="flex items-center gap-2 truncate">
          <div className="w-4 h-4 rounded-xs bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-white">IG</span>
          </div>
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {isInstagram ? 'Instagram 내부 전용 창' : title}
          </span>
          <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 rounded-xs text-zinc-400 font-mono hidden sm:inline">
            IN-APP WINDOW
          </span>
        </div>

        {/* Right: Window Controls & Zoom */}
        <div className="flex items-center gap-1.5">
          {/* Zoom In/Out Toolbar Controls */}
          <div className="flex items-center gap-0.5 text-xs text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded-sm border border-zinc-800">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-0.5 hover:text-white transition-colors cursor-pointer"
              title="창 내부 축소 (Zoom Out)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="text-[10px] font-mono px-1 hover:text-amber-400 cursor-pointer font-semibold"
              title="100% 원래 크기로 초기화"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-0.5 hover:text-white transition-colors cursor-pointer"
              title="창 내부 확대 (Zoom In)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Mobile / Desktop Toggle */}
          <button
            type="button"
            onClick={() => setDeviceMode(deviceMode === 'mobile' ? 'desktop' : 'mobile')}
            className={`p-1 rounded-sm text-xs flex items-center gap-1 cursor-pointer ${
              deviceMode === 'mobile'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={deviceMode === 'mobile' ? '모바일 가입 뷰 (추천)' : '데스크톱 뷰'}
          >
            {deviceMode === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-sm cursor-pointer"
            title="최소화"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-sm cursor-pointer"
            title={isMaximized ? '원래 크기로' : '전체 크기로'}
          >
            {isMaximized ? <Maximize2 className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 rounded-sm cursor-pointer"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Window Sub-Bar: Quick Shortcuts & Direct Signup Switcher */}
      <div className="bg-[#101014] border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              const target = 'https://www.instagram.com/accounts/emailsignup/';
              setCurrentUrl(target);
              if (onNavigate) onNavigate(target);
            }}
            className={`px-2 py-0.5 rounded-sm text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              currentUrl.includes('emailsignup')
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-xs'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <span>✉️ 이메일 가입</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              const target = 'https://www.instagram.com/accounts/signup/phone/';
              setCurrentUrl(target);
              if (onNavigate) onNavigate(target);
            }}
            className={`px-2 py-0.5 rounded-sm text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              currentUrl.includes('signup/phone')
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-xs'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <span>📱 전화번호 가입</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              const target = 'https://www.instagram.com/accounts/login/';
              setCurrentUrl(target);
              if (onNavigate) onNavigate(target);
            }}
            className={`px-2 py-0.5 rounded-sm text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              currentUrl.includes('login')
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-xs'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <span>🔑 로그인</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-zinc-400 truncate max-w-[140px] font-mono">
            {getCleanHost(currentUrl)}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              // Force iframe refresh
              const u = currentUrl;
              setCurrentUrl('');
              setTimeout(() => setCurrentUrl(u), 60);
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-sm cursor-pointer"
            title="새로고침"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. Window Viewport (The Embedded IFrame with Inside-Window Zoom) */}
      <div className="relative flex-1 w-full h-full bg-black overflow-auto flex items-center justify-center p-0">
        {/* Loading Bar */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800 z-30 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 w-1/2 animate-[progress_1.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Scaled Viewport Container */}
        <div
          className={`flex flex-col transition-transform duration-100 ${
            deviceMode === 'mobile' ? 'w-[440px] shadow-2xl border-x border-zinc-800' : 'w-full'
          }`}
          style={{
            height: zoom !== 100 ? `${100 / (zoom / 100)}%` : '100%',
            width: deviceMode === 'mobile' ? '440px' : (zoom !== 100 ? `${100 / (zoom / 100)}%` : '100%'),
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            transformOrigin: 'top center',
          }}
        >
          {currentUrl ? (
            <iframe
              key={currentUrl}
              src={iframeSrc}
              title="Internal Browser Floating Viewport"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full h-full border-0 bg-white"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              불러오는 중...
            </div>
          )}
        </div>

        {/* Floating In-Viewport Zoom Controls Widget */}
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md rounded-md px-2 py-1 shadow-lg text-xs text-zinc-300">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 hover:text-white rounded-xs cursor-pointer"
            title="축소 (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="text-[11px] font-mono px-1 hover:text-amber-400 font-semibold cursor-pointer"
            title="100% 리셋"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 hover:text-white rounded-xs cursor-pointer"
            title="확대 (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Resize Handle at Bottom-Right */}
        {!isMaximized && (
          <div
            onMouseDown={handleMouseDownResize}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center text-zinc-600 hover:text-zinc-300"
            title="창 크기 조절"
          >
            <svg viewBox="0 0 6 6" className="w-2.5 h-2.5 fill-current">
              <path d="M5 1L1 5h4V1zM5 3L3 5h2V3zM5 5v-0.1L4.9 5H5z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
