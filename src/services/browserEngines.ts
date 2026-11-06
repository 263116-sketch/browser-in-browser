import { SearchEngine } from '../types/browser';

export const SEARCH_ENGINES: Record<string, SearchEngine> = {
  google: {
    id: 'google',
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q=%s',
    icon: '🔍',
    placeholder: 'Search Google or type a URL...',
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    searchUrl: 'https://duckduckgo.com/?q=%s',
    icon: '🦆',
    placeholder: 'Search privately with DuckDuckGo...',
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search?q=%s',
    icon: '🅱️',
    placeholder: 'Search with Microsoft Bing...',
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    searchUrl: 'https://search.brave.com/search?q=%s',
    icon: '🦁',
    placeholder: 'Search with Brave Search...',
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    searchUrl: 'https://en.wikipedia.org/w/index.php?search=%s',
    icon: '🌐',
    placeholder: 'Search Wikipedia encyclopedia...',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    searchUrl: 'https://github.com/search?q=%s',
    icon: '🐙',
    placeholder: 'Search repositories and code...',
  },
};

export const SPEED_DIAL_SHORTCUTS = [
  {
    title: 'Wikipedia',
    url: 'https://en.wikipedia.org',
    category: 'Reference',
    description: 'The free encyclopedia',
    color: '#334155',
  },
  {
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
    category: 'Tech',
    description: 'Tech startup and programming news',
    color: '#ff6600',
  },
  {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    category: 'Dev',
    description: 'Web development reference for HTML, CSS, JS',
    color: '#0284c7',
  },
  {
    title: 'GitHub',
    url: 'https://github.com',
    category: 'Dev',
    description: 'Code repository and collaboration',
    color: '#181717',
  },
  {
    title: 'BBC World News',
    url: 'https://www.bbc.com/news',
    category: 'News',
    description: 'Global breaking news and analyses',
    color: '#b91c1c',
  },
  {
    title: 'Internet Archive',
    url: 'https://archive.org',
    category: 'Reference',
    description: 'Wayback Machine & digital library',
    color: '#475569',
  },
  {
    title: 'DuckDuckGo',
    url: 'https://duckduckgo.com',
    category: 'Search',
    description: 'Privacy-focused web search',
    color: '#de5833',
  },
  {
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    category: 'Dev',
    description: 'Developer Q&A and knowledge base',
    color: '#f59e0b',
  },
  {
    title: 'NPR News',
    url: 'https://www.npr.org',
    category: 'News',
    description: 'Public radio news and culture',
    color: '#0284c7',
  },
  {
    title: 'W3Schools',
    url: 'https://www.w3schools.com',
    category: 'Dev',
    description: 'Web development tutorials',
    color: '#059669',
  },
  {
    title: 'ArXiv',
    url: 'https://arxiv.org',
    category: 'Science',
    description: 'Open-access scientific preprints',
    color: '#9333ea',
  },
  {
    title: 'Project Gutenberg',
    url: 'https://www.gutenberg.org',
    category: 'Reference',
    description: '60,000+ free public domain eBooks',
    color: '#b45309',
  },
];

/**
 * Intelligent Omnibox input parser:
 * Checks whether user entered a valid URL or a search query
 */
export function resolveInputToUrl(input: string, searchEngineId = 'google'): string {
  const trimmed = input.trim();
  if (!trimmed) return 'omni://newtab';

  // Internal schemes
  if (trimmed === 'omni://newtab' || trimmed === 'about:blank' || trimmed.startsWith('omni://')) {
    return trimmed;
  }

  // Check if it looks like an explicit URL with protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Check if it looks like a localhost, IP, or standard domain.com
  const isLocalhost = /^localhost(:\d+)?(\/.*)?$/i.test(trimmed);
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed);
  const isDomainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed);

  if (isLocalhost || isIpAddress || isDomainPattern) {
    return `https://${trimmed}`;
  }

  // Otherwise, treat as search query
  const engine = SEARCH_ENGINES[searchEngineId] || SEARCH_ENGINES.google;
  return engine.searchUrl.replace('%s', encodeURIComponent(trimmed));
}

/**
 * Build iframe source based on active mode
 */
export function getIframeSrc(url: string, mode: 'proxy' | 'direct' | 'reader'): string {
  if (url === 'omni://newtab' || url === 'about:blank' || !url) {
    return 'about:blank';
  }

  if (mode === 'proxy') {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }

  // Direct embed
  return url;
}

/**
 * Get domain favicon
 */
export function getFaviconUrl(url: string): string {
  if (!url || url === 'omni://newtab' || url.startsWith('omni://')) {
    return '';
  }
  try {
    const parsed = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * Extract clean display host or title
 */
export function getCleanHost(url: string): string {
  if (url === 'omni://newtab') return 'New Tab';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
