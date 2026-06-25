import { getToken } from '../api/session';
import { previewLink, PulsePreview } from '../api/client';
import { fetchOgMeta } from './og';

export interface ParsedLink {
  title: string;
  venue?: string;
  dateISO?: string; // YYYY-MM-DD, used to place the event on its real day
  dateLabel?: string; // human-readable for display
  image?: string;
  url?: string; // the original link, so the event can deep-link back to it
}

function fromPreview(p: PulsePreview): ParsedLink {
  return {
    title: p.title || 'Event',
    venue: p.site_name || p.source_domain || undefined,
    dateISO: p.event_date || undefined,
    dateLabel: p.event_date ? `${p.event_date}${p.event_time ? ` · ${p.event_time}` : ''}` : undefined,
    image: p.image_url || undefined,
  };
}

// Real parsing, in priority order:
//   1. the backend's robust server-side parser (only when authenticated)
//   2. client-side OG/JSON-LD extraction (works on native; web via CORS proxy)
//   3. a URL-derived stub, so it still reflects the link you actually pasted
export async function parseLink(url: string): Promise<ParsedLink> {
  const result = await parseInner(url);
  return { ...result, url }; // always carry the source link for "See event"
}

async function parseInner(url: string): Promise<ParsedLink> {
  const token = await getToken();
  if (token) {
    try {
      const p = await previewLink(url);
      if (p && p.title) return fromPreview(p);
    } catch {
      /* fall through */
    }
  }

  try {
    return await fetchOgMeta(url);
  } catch {
    /* fall through */
  }

  let domain = url;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw url */
  }
  return { title: domain || 'Link', venue: domain };
}
