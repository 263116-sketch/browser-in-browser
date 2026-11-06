import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

// Memory store for cross-device sync, backed by local JSON file
interface SyncData {
  bookmarks: any[];
  folders: any[];
  history: any[];
  openTabs: any[];
  updatedAt: number;
  devices: { id: string; name: string; lastSeen: number }[];
}

const SYNC_CACHE: Map<string, SyncData> = new Map();
const SYNC_FILE_PATH = path.join(process.cwd(), '.sync-data.json');

// Initialize sync store from disk if present
try {
  if (fs.existsSync(SYNC_FILE_PATH)) {
    const raw = fs.readFileSync(SYNC_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      SYNC_CACHE.set(k, v as SyncData);
    }
  }
} catch (e) {
  console.warn('Could not load .sync-data.json, starting with fresh in-memory sync cache.');
}

function persistSyncStore() {
  try {
    const obj: Record<string, SyncData> = {};
    for (const [k, v] of SYNC_CACHE.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SYNC_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    // Non-critical background save
  }
}

// Helper to parse query parameters
function parseUrlAndQuery(reqUrl: string = '') {
  const dummyBase = 'http://localhost';
  try {
    const parsed = new URL(reqUrl, dummyBase);
    return {
      pathname: parsed.pathname,
      searchParams: parsed.searchParams,
    };
  } catch {
    return {
      pathname: reqUrl.split('?')[0] || '',
      searchParams: new URLSearchParams(reqUrl.split('?')[1] || ''),
    };
  }
}

// Clean HTML for reader mode
function extractReaderContent(html: string, originalUrl: string) {
  let title = '';
  let author = '';
  let description = '';
  let heroImage = '';
  let siteName = '';

  // Extract title
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  title = ogTitleMatch ? ogTitleMatch[1] : (titleTagMatch ? titleTagMatch[1] : 'Article');

  // Extract author
  const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i);
  if (authorMatch) author = authorMatch[1];

  // Extract description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) description = descMatch[1];

  // Extract hero image
  const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                   html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (imgMatch) heroImage = imgMatch[1];

  // Extract site name
  const siteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
  if (siteMatch) {
    siteName = siteMatch[1];
  } else {
    try {
      siteName = new URL(originalUrl).hostname.replace('www.', '');
    } catch {
      siteName = 'Website';
    }
  }

  // Strip scripts, styles, forms, navs, headers, footers
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // Look for main or article tags first
  let bodyMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                  cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                  cleaned.match(/<div[^>]*class=["'][^"']*(?:post-content|article-body|entry-content|story-body|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  let contentHtml = bodyMatch ? bodyMatch[1] : cleaned;

  // Filter out remaining unwanted tags while keeping p, h1-h6, blockquote, ul, ol, li, img, a
  const paragraphs: string[] = [];
  const pRegex = /<(?:p|h[2-4]|blockquote|ul|ol)[^>]*>([\s\S]*?)<\/(?:p|h[2-4]|blockquote|ul|ol)>/gi;
  let match;
  while ((match = pRegex.exec(contentHtml)) !== null) {
    const rawInner = match[1].replace(/<[^>]+>/g, ' ').trim();
    if (rawInner.length > 25) {
      paragraphs.push(match[0]);
    }
  }

  const finalBodyHtml = paragraphs.length > 0 
    ? paragraphs.join('\n') 
    : `<p>${description || 'No direct article content could be extracted. Please switch to Standard or Proxy view.'}</p>`;

  // Calculate words and read time
  const plainText = finalBodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(' ').length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title: title.trim(),
    author: author.trim(),
    description: description.trim(),
    heroImage,
    siteName,
    url: originalUrl,
    contentHtml: finalBodyHtml,
    wordCount,
    readingTimeMinutes,
  };
}

// Master HTTP request dispatcher
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const { pathname, searchParams } = parseUrlAndQuery(req.url);

  if (!pathname.startsWith('/api/')) {
    return false; // Let Vite / Express handle static or other routes
  }

  // Enable CORS for API routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // 1. PROXY ENDPOINT: /api/proxy?url=...
  if (pathname === '/api/proxy') {
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return true;
    }

    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const upstreamRes = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      clearTimeout(timeoutId);

      const contentType = upstreamRes.headers.get('content-type') || 'text/html';

      // If it's an HTML page, rewrite frame headers and inject bridge script
      if (contentType.includes('text/html')) {
        let html = await upstreamRes.text();
        const parsedTarget = new URL(targetUrl);
        const origin = parsedTarget.origin;

        // Bridge script to enable cross-origin browser controls and SPA route matching
        const bridgeScript = `
          <script>
            (function() {
              try {
                // Synchronize pathname so client SPA routers (React Router, Next.js, etc.) match routes
                if (window.history && window.history.replaceState) {
                  try {
                    window.history.replaceState(null, '', '${parsedTarget.pathname}${parsedTarget.search}');
                  } catch(e) {}
                }

                // Intercept link clicks to keep navigation inside the internal browser
                document.addEventListener('click', function(e) {
                  var a = e.target.closest('a');
                  if (a && a.href && !a.href.startsWith('javascript:')) {
                    e.preventDefault();
                    window.parent.postMessage({
                      type: 'OMNI_BROWSER_NAVIGATE',
                      url: a.href,
                      title: a.innerText || document.title
                    }, '*');
                  }
                }, true);

                // Notify parent on load
                window.addEventListener('load', function() {
                  window.parent.postMessage({
                    type: 'OMNI_BROWSER_LOADED',
                    url: '${targetUrl}',
                    title: document.title || '${parsedTarget.hostname}'
                  }, '*');

                  // Detect known anti-iframe error messages
                  setTimeout(function() {
                    var text = document.body ? document.body.innerText : '';
                    if (
                      text.includes("Page isn't available") ||
                      text.includes("페이지를 사용할 수 없습니다") ||
                      text.includes("Sorry, this page isn't available") ||
                      text.includes("Please enable cookies")
                    ) {
                      window.parent.postMessage({
                        type: 'OMNI_PAGE_RESTRICTED',
                        url: '${targetUrl}',
                        hostname: '${parsedTarget.hostname}'
                      }, '*');
                    }
                  }, 800);
                });
              } catch (err) {}
            })();
          </script>
        `;

        // Inject <base href="..."> so relative paths, scripts, images resolve correctly
        const baseTag = `<base href="${origin}/">`;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${baseTag}${bridgeScript}`);
        } else if (html.includes('<HEAD>')) {
          html = html.replace('<HEAD>', `<HEAD>${baseTag}${bridgeScript}`);
        } else {
          html = `${baseTag}${bridgeScript}${html}`;
        }

        res.statusCode = upstreamRes.status || 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(html);
        return true;
      } else {
        // Direct media, JSON, or asset pipe
        const buffer = await upstreamRes.arrayBuffer();
        res.statusCode = upstreamRes.status;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(Buffer.from(buffer));
        return true;
      }
    } catch (err: any) {
      // Return a graceful browser fallback page
      const errorMessage = err?.name === 'AbortError' ? 'Connection timed out (12s)' : (err?.message || 'Failed to fetch webpage');
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Navigation Warning - OmniBrowser</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 540px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { margin-top: 0; color: #38bdf8; font-size: 22px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            .badge { display: inline-block; background: #ef444420; color: #f87171; border: 1px solid #ef444440; padding: 4px 10px; border-radius: 9999px; font-size: 12px; margin-bottom: 12px; }
            .btn { display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin: 8px; cursor: pointer; border: none; transition: background 0.2s; }
            .btn:hover { background: #1d4ed8; }
            .btn-secondary { background: #334155; color: #cbd5e1; }
            .btn-secondary:hover { background: #475569; }
            .url-box { background: #0f172a; border: 1px solid #334155; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Proxy Connection Notice</div>
            <h2>Unable to load page via Proxy</h2>
            <div class="url-box">${targetUrl}</div>
            <p>Reason: ${errorMessage}. Some high-security websites require direct loading, reader mode, or opening in a dedicated window.</p>
            <div>
              <button class="btn" onclick="window.parent.postMessage({ type: 'OMNI_SWITCH_DIRECT', url: '${targetUrl}' }, '*')">Switch to Direct Embed</button>
              <button class="btn btn-secondary" onclick="window.parent.postMessage({ type: 'OMNI_SWITCH_READER', url: '${targetUrl}' }, '*')">Open Reader Mode</button>
              <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Open in New Window</a>
            </div>
          </div>
        </body>
        </html>
      `;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fallbackHtml);
      return true;
    }
  }

  // 2. READER MODE ENDPOINT: /api/reader?url=...
  if (pathname === '/api/reader') {
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return true;
    }

    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const html = await response.text();
      const readerData = extractReaderContent(html, targetUrl);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(readerData));
      return true;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: err?.message || 'Failed to extract article content',
        title: 'Reader Mode unavailable',
        contentHtml: `<p>Could not extract text from this website. Try visiting via Standard or Direct view.</p>`,
      }));
      return true;
    }
  }

  // 3. METADATA ENDPOINT: /api/metadata?url=...
  if (pathname === '/api/metadata') {
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return true;
    }

    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      const parsed = new URL(targetUrl);
      const defaultFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      const html = await response.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      const iconMatch = html.match(/<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);

      let favicon = defaultFavicon;
      if (iconMatch && iconMatch[1]) {
        let iconUrl = iconMatch[1];
        if (iconUrl.startsWith('//')) {
          favicon = 'https:' + iconUrl;
        } else if (iconUrl.startsWith('/')) {
          favicon = parsed.origin + iconUrl;
        } else if (iconUrl.startsWith('http')) {
          favicon = iconUrl;
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        title: titleMatch ? titleMatch[1].trim() : parsed.hostname,
        description: descMatch ? descMatch[1].trim() : '',
        favicon,
        hostname: parsed.hostname,
        url: targetUrl,
      }));
      return true;
    } catch {
      // Fallback
      try {
        const parsed = new URL(targetUrl);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          title: parsed.hostname,
          description: '',
          favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
          hostname: parsed.hostname,
          url: targetUrl,
        }));
        return true;
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid URL' }));
        return true;
      }
    }
  }

  // 4. CROSS-DEVICE SYNC ENDPOINTS: /api/sync/:key
  if (pathname.startsWith('/api/sync/')) {
    const syncKey = pathname.replace('/api/sync/', '').trim().toUpperCase();
    if (!syncKey) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing sync key' }));
      return true;
    }

    if (req.method === 'GET') {
      const data = SYNC_CACHE.get(syncKey);
      if (!data) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Sync key not found on cloud yet', isNew: true }));
        return true;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return true;
    }

    if (req.method === 'POST') {
      let bodyStr = '';
      for await (const chunk of req) {
        bodyStr += chunk;
      }

      try {
        const payload = JSON.parse(bodyStr || '{}');
        const existing = SYNC_CACHE.get(syncKey) || {
          bookmarks: [],
          folders: [],
          history: [],
          openTabs: [],
          updatedAt: Date.now(),
          devices: [],
        };

        const deviceId = payload.deviceId || 'device-' + Math.random().toString(36).substring(2, 7);
        const deviceName = payload.deviceName || 'Web Browser';

        // Update devices list
        const updatedDevices = [...existing.devices.filter(d => d.id !== deviceId), {
          id: deviceId,
          name: deviceName,
          lastSeen: Date.now(),
        }];

        const updatedData: SyncData = {
          bookmarks: Array.isArray(payload.bookmarks) ? payload.bookmarks : existing.bookmarks,
          folders: Array.isArray(payload.folders) ? payload.folders : existing.folders,
          history: Array.isArray(payload.history) ? payload.history : existing.history,
          openTabs: Array.isArray(payload.openTabs) ? payload.openTabs : existing.openTabs,
          updatedAt: Date.now(),
          devices: updatedDevices,
        };

        SYNC_CACHE.set(syncKey, updatedData);
        persistSyncStore();

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          updatedAt: updatedData.updatedAt,
          deviceCount: updatedDevices.length,
          syncKey,
        }));
        return true;
      } catch (err: any) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid payload: ' + (err?.message || '') }));
        return true;
      }
    }

    if (req.method === 'DELETE') {
      SYNC_CACHE.delete(syncKey);
      persistSyncStore();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: 'Cloud sync data cleared for ' + syncKey }));
      return true;
    }
  }

  return false;
}
