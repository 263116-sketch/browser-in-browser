import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Sun,
  Moon,
  Coffee,
  ExternalLink,
  BookOpen,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

interface ReaderModeViewProps {
  url: string;
  onExitReader: () => void;
  onNavigate: (url: string) => void;
}

interface ReaderData {
  title: string;
  author: string;
  description: string;
  heroImage: string;
  siteName: string;
  url: string;
  contentHtml: string;
  wordCount: number;
  readingTimeMinutes: number;
}

export const ReaderModeView: React.FC<ReaderModeViewProps> = ({
  url,
  onExitReader,
}) => {
  const [data, setData] = useState<ReaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader customization state
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');
  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light'>('dark');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/reader?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load reader view');
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || 'Failed to extract article');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [url]);

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme styles
  const themeStyles = {
    dark: 'bg-[#09090b] text-zinc-200 border-zinc-800',
    sepia: 'bg-[#f4ecd8] text-[#433422] border-[#e2d5bd]',
    light: 'bg-white text-zinc-800 border-zinc-200',
  };

  const articleFontStyles = {
    sans: 'font-sans leading-relaxed',
    serif: 'font-serif leading-loose tracking-wide',
    mono: 'font-mono leading-relaxed',
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
        <span className="text-xs font-medium">Extracting clean article content...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-300 p-6 text-center">
        <BookOpen className="w-10 h-10 text-amber-500 mb-3" />
        <h2 className="text-lg font-semibold mb-2">Reader View Unavailable</h2>
        <p className="text-xs text-zinc-400 max-w-md mb-5">
          This webpage may not contain a standard article format, or is behind a strict wall.
        </p>
        <button
          type="button"
          onClick={onExitReader}
          className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold shadow-sm"
        >
          Return to Standard View
        </button>
      </div>
    );
  }

  return (
    <div className={`h-full w-full overflow-y-auto ${themeStyles[theme]} transition-colors duration-200`}>
      {/* Reader Floating Controls Toolbar */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-opacity-80 border-b px-4 py-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExitReader}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Standard View</span>
          </button>
        </div>

        {/* Font & Theme Customizer */}
        <div className="flex items-center gap-2.5">
          {/* Font Family */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-md p-0.5 border border-black/10 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setFontFamily('sans')}
              className={`px-2 py-0.5 rounded-sm font-sans ${fontFamily === 'sans' ? 'bg-zinc-800 text-white' : 'opacity-70'}`}
            >
              Sans
            </button>
            <button
              type="button"
              onClick={() => setFontFamily('serif')}
              className={`px-2 py-0.5 rounded-sm font-serif ${fontFamily === 'serif' ? 'bg-zinc-800 text-white' : 'opacity-70'}`}
            >
              Serif
            </button>
            <button
              type="button"
              onClick={() => setFontFamily('mono')}
              className={`px-2 py-0.5 rounded-sm font-mono ${fontFamily === 'mono' ? 'bg-zinc-800 text-white' : 'opacity-70'}`}
            >
              Mono
            </button>
          </div>

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-md p-0.5 border border-black/10 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="px-2 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-sm font-bold"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="px-1.5 font-mono text-[11px]">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize(Math.min(26, fontSize + 2))}
              className="px-2 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-sm font-bold"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Theme Choosers */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-md p-0.5 border border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-1 rounded-sm ${theme === 'dark' ? 'bg-zinc-800 text-zinc-100' : 'opacity-70'}`}
              title="Dark Theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('sepia')}
              className={`p-1 rounded-sm ${theme === 'sepia' ? 'bg-[#e4d7bc] text-[#433422]' : 'opacity-70'}`}
              title="Sepia Parchment Theme"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-1 rounded-sm ${theme === 'light' ? 'bg-zinc-200 text-zinc-800' : 'opacity-70'}`}
              title="Light Theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy Link */}
          <button
            type="button"
            onClick={copyUrl}
            className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Copy article URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
          </button>
        </div>
      </div>

      {/* Article Content Container */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Source metadata */}
        <div className="flex items-center gap-2 text-xs opacity-70 uppercase tracking-widest font-semibold mb-3">
          <span>{data.siteName}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {data.readingTimeMinutes} min read ({data.wordCount} words)
          </span>
        </div>

        {/* Article Title */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 font-serif">
          {data.title}
        </h1>

        {/* Author / Date */}
        {data.author && (
          <div className="text-xs opacity-80 mb-5 italic">By {data.author}</div>
        )}

        {/* Hero image if present */}
        {data.heroImage && (
          <div className="mb-6 rounded-md overflow-hidden shadow-md">
            <img
              src={data.heroImage}
              alt=""
              className="w-full max-h-80 object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Article Body */}
        <div
          className={`prose max-w-none ${articleFontStyles[fontFamily]}`}
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: data.contentHtml }}
        />

        {/* Footer */}
        <div className="mt-10 pt-5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs opacity-60">
          <span>Extracted by OmniBrowser Reader</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            <span>Original Webpage</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </main>
    </div>
  );
};
