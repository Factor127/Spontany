import { Platform } from 'react-native';
import type { ParsedLink } from './parse';

// Client-side Open Graph / schema.org parser — a port of the backend's
// fetchMetadata. On native, fetch hits the page directly (no CORS). On web,
// browsers block cross-origin page fetches, so we route through public CORS
// proxies (dev/mock convenience only; the native build never uses these). They
// are individually flaky, so we try several and take the first that responds.
const WEB_PROXIES: ((u: string) => string)[] = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function absolutize(rel: string | null, base: string): string | undefined {
  if (!rel) return undefined;
  if (/^https?:\/\//i.test(rel)) return rel;
  try {
    return new URL(rel, base).href;
  } catch {
    return rel;
  }
}

async function fetchText(target: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(target, { signal: ctrl.signal, headers: { Accept: 'text/html,*/*' } });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function getHtml(url: string): Promise<string> {
  if (Platform.OS !== 'web') return fetchText(url); // native: no CORS, fetch directly

  // 1) same-origin dev API route — reliable, no third party, no CORS.
  try {
    const html = await fetchText(`/ogfetch?url=${encodeURIComponent(url)}`);
    if (html && html.length > 0) return html;
  } catch {
    /* route unavailable (e.g. static export) — fall back to proxies */
  }

  // 2) public CORS proxies, raced — first to respond wins.
  return Promise.any(WEB_PROXIES.map((make) => fetchText(make(url))));
}

function findEventDate(html: string): { date?: string; time?: string } {
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html)) !== null) {
    let parsed: any;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] && Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const ty = n['@type'];
      const isEvent =
        (typeof ty === 'string' && /Event/i.test(ty)) || (Array.isArray(ty) && ty.some((x: unknown) => /Event/i.test(String(x))));
      if (!isEvent) continue;
      const start = n.startDate || n.startTime;
      if (start) {
        const dm = String(start).match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
        if (dm) return { date: dm[1], time: dm[2] };
      }
    }
  }

  // Fallbacks for pages without schema.org Event JSON-LD: meta tags and
  // <time datetime>. Best-effort — some event sites still won't expose a date.
  const metaDate =
    html.match(
      /<meta[^>]+(?:itemprop|property|name)=["'](?:startDate|event:start_time|og:event:start_time)["'][^>]+content=["'](\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/i,
    ) || html.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/i);
  if (metaDate) return { date: metaDate[1], time: metaDate[2] };

  return {};
}

export async function fetchOgMeta(url: string): Promise<ParsedLink> {
  const html = await getHtml(url);
  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? decode(m[1]) : null;
  };

  const title =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    pick(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<title[^>]*>([^<]+)<\/title>/i);

  if (!title) throw new Error('no metadata');

  const img =
    pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    pick(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  const site = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  let domain: string | undefined;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* leave undefined */
  }

  const { date, time } = findEventDate(html);

  return {
    title: title.trim(),
    venue: site || domain || undefined,
    dateISO: date,
    dateLabel: date ? `${date}${time ? ` · ${time}` : ''}` : undefined,
    image: absolutize(img, url),
  };
}
