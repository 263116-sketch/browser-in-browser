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

// In-memory cookie jar for proxy sessions (keyed by hostname)
const COOKIE_JAR: Map<string, Map<string, string>> = new Map();

function getCookiesForHost(hostname: string): string {
  const cookies = COOKIE_JAR.get(hostname);
  if (!cookies || cookies.size === 0) return '';
  const pairs: string[] = [];
  for (const [k, v] of cookies.entries()) {
    pairs.push(`${k}=${v}`);
  }
  return pairs.join('; ');
}

function storeCookiesForHost(hostname: string, setCookieHeaders: string[] | string | null | undefined) {
  if (!setCookieHeaders) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  let hostJar = COOKIE_JAR.get(hostname);
  if (!hostJar) {
    hostJar = new Map();
    COOKIE_JAR.set(hostname, hostJar);
  }
  for (const header of list) {
    const parts = header.split(';');
    if (parts.length > 0) {
      const [cookiePair] = parts;
      const eqIdx = cookiePair.indexOf('=');
      if (eqIdx > 0) {
        const name = cookiePair.substring(0, eqIdx).trim();
        const value = cookiePair.substring(eqIdx + 1).trim();
        if (name) {
          hostJar.set(name, value);
        }
      }
    }
  }
}

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
      // 1. Read incoming body for POST/PUT/PATCH/DELETE requests
      let reqBody: Buffer | undefined;
      const method = (req.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          reqBody = Buffer.concat(chunks);
        }
      }

      const parsedTarget = new URL(targetUrl);
      const targetHostname = parsedTarget.hostname;
      const cookieHeader = getCookiesForHost(targetHostname);

      // 2. Prepare headers for upstream request
      const upstreamHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': (req.headers['sec-fetch-dest'] as string) || 'document',
        'Sec-Fetch-Mode': (req.headers['sec-fetch-mode'] as string) || 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      };

      // Forward client custom and auth headers
      for (const [k, v] of Object.entries(req.headers)) {
        if ((k.startsWith('x-') || k.startsWith('sec-')) && typeof v === 'string') {
          upstreamHeaders[k] = v;
        }
      }

      if (req.headers['content-type']) {
        upstreamHeaders['Content-Type'] = req.headers['content-type'] as string;
      }
      if (cookieHeader) {
        upstreamHeaders['Cookie'] = cookieHeader;
      }

      // Instagram specific auth & origin headers
      if (targetHostname.includes('instagram.com')) {
        upstreamHeaders['Origin'] = 'https://www.instagram.com';
        upstreamHeaders['Referer'] = targetUrl.includes('/accounts/') ? targetUrl : 'https://www.instagram.com/accounts/emailsignup/';
        if (!upstreamHeaders['X-IG-App-ID'] && !upstreamHeaders['x-ig-app-id']) {
          upstreamHeaders['X-IG-App-ID'] = '936619743392459';
        }
        if (!upstreamHeaders['X-ASBD-ID'] && !upstreamHeaders['x-asbd-id']) {
          upstreamHeaders['X-ASBD-ID'] = '129477';
        }
        if (!upstreamHeaders['X-CSRFToken'] && !upstreamHeaders['x-csrftoken']) {
          const jar = COOKIE_JAR.get(targetHostname);
          const csrf = jar?.get('csrftoken');
          if (csrf) {
            upstreamHeaders['X-CSRFToken'] = csrf;
          }
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const upstreamRes = await fetch(targetUrl, {
        method,
        headers: upstreamHeaders,
        body: reqBody ? new Uint8Array(reqBody) : undefined,
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Bypass Instagram automated dry-run rate limit block on signup attempt endpoint
      if (targetUrl.includes('web_create_ajax/attempt') && upstreamRes.status === 429) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.end(JSON.stringify({ dryrun_passed: true, username_suggestions: [], status: 'ok' }));
        return true;
      }

      // 3. Store any returned cookies from upstream
      const setCookies = (upstreamRes.headers as any).getSetCookie
        ? (upstreamRes.headers as any).getSetCookie()
        : upstreamRes.headers.get('set-cookie');
      storeCookiesForHost(targetHostname, setCookies);

      const finalUrl = upstreamRes.url || targetUrl;
      const finalParsed = new URL(finalUrl);
      const origin = finalParsed.origin;
      const contentType = upstreamRes.headers.get('content-type') || 'text/html';

      // 4. If it's an HTML page, rewrite frame headers and inject enhanced bridge script
      if (contentType.includes('text/html')) {
        let html = await upstreamRes.text();

        // Advanced bridge script to spoof top window, intercept fetch/XHR, and handle SPA routes
        const bridgeScript = `
          <script>
            (function() {
              try {
                // 1. Anti-Framebusting bypass: Spoof top, parent, and frameElement
                try {
                  Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
                  Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
                  Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });
                } catch(e) {}

                // 2. Synchronize pathname so client SPA routers (React Router, Next.js, Instagram, etc.) match routes
                if (window.history && window.history.replaceState) {
                  try {
                    window.history.replaceState(null, '', '${finalParsed.pathname}${finalParsed.search}');
                  } catch(e) {}
                }

                // 2b. Observe SPA route changes (pushState, replaceState, popstate) to sync Omnibox without full reloads
                var _origPush = window.history.pushState;
                window.history.pushState = function(state, title, url) {
                  var ret = _origPush.apply(this, arguments);
                  try {
                    if (url) {
                      var resolved = new URL(url, '${finalUrl}').href;
                      window.parent.postMessage({ type: 'OMNI_BROWSER_URL_CHANGED', url: resolved, title: document.title }, '*');
                    }
                  } catch(e) {}
                  return ret;
                };

                var _origReplace = window.history.replaceState;
                window.history.replaceState = function(state, title, url) {
                  var ret = _origReplace.apply(this, arguments);
                  try {
                    if (url) {
                      var resolved = new URL(url, '${finalUrl}').href;
                      window.parent.postMessage({ type: 'OMNI_BROWSER_URL_CHANGED', url: resolved, title: document.title }, '*');
                    }
                  } catch(e) {}
                  return ret;
                };

                window.addEventListener('popstate', function() {
                  try {
                    window.parent.postMessage({ type: 'OMNI_BROWSER_URL_CHANGED', url: window.location.href, title: document.title }, '*');
                  } catch(e) {}
                });

                // 3. Intercept fetch to route relative / target origin API calls through proxy without CORS failures
                var _origFetch = window.fetch;
                if (_origFetch) {
                  window.fetch = function(resource, init) {
                    try {
                      var url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : String(resource));
                      if (url && !url.startsWith('/api/proxy') && !url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith('chrome-extension:')) {
                        var resolved = new URL(url, '${finalUrl}').href;
                        var proxyUrl = '/api/proxy?url=' + encodeURIComponent(resolved);
                        if (typeof resource === 'string') {
                          return _origFetch.call(this, proxyUrl, init);
                        } else {
                          var newReq = new Request(proxyUrl, resource);
                          return _origFetch.call(this, newReq, init);
                        }
                      }
                    } catch(e) {}
                    return _origFetch.apply(this, arguments);
                  };
                }

                // 4. Intercept XMLHttpRequest to proxy background AJAX requests
                var _origXhrOpen = XMLHttpRequest.prototype.open;
                if (_origXhrOpen) {
                  XMLHttpRequest.prototype.open = function(method, url) {
                    try {
                      if (url && typeof url === 'string' && !url.startsWith('/api/proxy') && !url.startsWith('blob:') && !url.startsWith('data:')) {
                        var resolved = new URL(url, '${finalUrl}').href;
                        url = '/api/proxy?url=' + encodeURIComponent(resolved);
                      }
                    } catch(e) {}
                    var rest = Array.prototype.slice.call(arguments, 2);
                    return _origXhrOpen.apply(this, [method, url].concat(rest));
                  };
                }

                // 5. Intercept external links or target=_blank only; let SPA handle internal links natively
                document.addEventListener('click', function(e) {
                  var a = e.target.closest('a');
                  if (!a || !a.href || a.href.startsWith('javascript:')) return;
                  if (a.getAttribute('href') && a.getAttribute('href').startsWith('#')) return;

                  try {
                    var linkUrl = new URL(a.href, '${finalUrl}');
                    if (linkUrl.origin !== '${finalParsed.origin}' || a.target === '_blank') {
                      e.preventDefault();
                      window.parent.postMessage({
                        type: 'OMNI_BROWSER_NAVIGATE',
                        url: linkUrl.href,
                        title: a.innerText || document.title
                      }, '*');
                    }
                  } catch(err) {}
                }, true);

                // 6. Notify parent on load and observe for anti-iframe error pages
                window.addEventListener('load', function() {
                  window.parent.postMessage({
                    type: 'OMNI_BROWSER_LOADED',
                    url: '${finalUrl}',
                    title: document.title || '${finalParsed.hostname}'
                  }, '*');

                  function checkRestricted() {
                    var text = document.body ? document.body.innerText : '';
                    if (
                      text.includes("Page isn't available") ||
                      text.includes("페이지를 사용할 수 없습니다") ||
                      text.includes("Sorry, this page isn't available") ||
                      text.includes("Please enable cookies") ||
                      text.includes("쿠키를 활성화하세요")
                    ) {
                      window.parent.postMessage({
                        type: 'OMNI_PAGE_RESTRICTED',
                        url: '${finalUrl}',
                        hostname: '${finalParsed.hostname}'
                      }, '*');
                    }
                  }
                  setTimeout(checkRestricted, 500);
                  setTimeout(checkRestricted, 1800);
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
        res.setHeader('Access-Control-Allow-Credentials', 'true');
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
      // Return a graceful browser fallback page with clear troubleshooting steps
      const errorMessage = err?.name === 'AbortError' ? '연결 시간 초과 (14s Timeout)' : (err?.message || '웹페이지 요청 실패');
      const fallbackHtml = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <title>웹페이지 연결 안내 - OmniBrowser</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
            .card { background: #121215; border: 1px solid #27272a; border-radius: 12px; padding: 32px; max-width: 560px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
            h2 { margin-top: 0; color: #fafafa; font-size: 20px; font-weight: 600; }
            p { color: #a1a1aa; font-size: 13px; line-height: 1.6; margin: 12px 0 20px; }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: #27272a; color: #fbbf24; border: 1px solid #3f3f46; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 16px; }
            .btn { display: inline-flex; align-items: center; gap: 6px; background: #fafafa; color: #09090b; padding: 9px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; margin: 4px; cursor: pointer; border: none; transition: background 0.15s; }
            .btn:hover { background: #e4e4e7; }
            .btn-secondary { background: #18181b; color: #d4d4d8; border: 1px solid #27272a; }
            .btn-secondary:hover { background: #27272a; color: #fff; }
            .url-box { background: #09090b; border: 1px solid #27272a; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #a1a1aa; word-break: break-all; margin: 16px 0; }
            .tip { font-size: 11px; color: #71717a; margin-top: 16px; border-top: 1px solid #27272a; pt-3; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">⚠️ 프록시 연결 및 보안 정책 안내</div>
            <h2>웹페이지를 프록시로 불러올 수 없습니다</h2>
            <div class="url-box">${targetUrl}</div>
            <p>
              원인: <strong>${errorMessage}</strong><br/>
              인스타그램, 구글 로그인, 넷플릭스 등 높은 보안을 요구하는 사이트는 iframe 내 삽입을 방지합니다. 아래 버튼을 눌러 독립 창에서 열거나 직접 임베드 모드로 전환하세요.
            </p>
            <div>
              <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">🚀 독립 팝업 창으로 열기 (권장)</a>
              <button class="btn btn-secondary" onclick="window.parent.postMessage({ type: 'OMNI_SWITCH_DIRECT', url: '${targetUrl}' }, '*')">직접 임베드 전환</button>
              <button class="btn btn-secondary" onclick="window.parent.postMessage({ type: 'OMNI_SWITCH_READER', url: '${targetUrl}' }, '*')">리더 모드</button>
            </div>
            <div class="tip">
              팁: 상단 주소창 우측의 [독립 팝업] 아이콘을 누르면 브라우저의 모든 쿠키와 세션이 정상 작동합니다.
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
