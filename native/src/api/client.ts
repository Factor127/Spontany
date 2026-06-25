import { BASE_URL } from './config';
import { getToken } from './session';

// Day ownership as the backend stores it: 'self' = I have the kids,
// 'coparent' = the other parent has them (so I'm free). `note` is net-new
// (Phase 3) — typed here so the client is ready when the column lands.
export interface ApiDay {
  date: string; // YYYY-MM-DD
  owner: 'self' | 'coparent';
  tags: string[];
  note?: string | null;
}

export interface CalendarResp {
  days: ApiDay[];
  user: { id: string; name: string; role?: string };
  approved_until?: string;
}

export interface Me {
  id: string;
  name: string;
  role: string;
  work_schedule?: string | null;
}

export interface Connection {
  id: string;
  status: string;
  relationship_type: string;
  other_user_id: string;
  other_name: string;
}

export interface ConnectionsResp {
  connections: Connection[];
}

async function api<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(BASE_URL + path, {
    headers: token ? { 'X-Access-Token': token } : {},
  });
  if (!res.ok) {
    throw new Error(`${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}

export const getMe = () => api<Me>('/api/me');
export const getCalendar = (userId: string) => api<CalendarResp>(`/api/calendar/${userId}`);
export const getConnections = () => api<ConnectionsResp>('/api/connections/all');

// Matches the backend's fetchMetadata output (returned under `preview`).
export interface PulsePreview {
  title?: string;
  description?: string;
  image_url?: string;
  source_domain?: string;
  site_name?: string;
  event_date?: string;
  event_time?: string;
}

// Parse a pasted URL into event metadata via the existing /api/pulse/preview.
// The endpoint requires auth and wraps the result as { ok, preview }.
export async function previewLink(url: string): Promise<PulsePreview> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/pulse/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Access-Token': token } : {}) },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`${res.status} on /api/pulse/preview`);
  const json = (await res.json()) as { preview?: PulsePreview };
  return json.preview ?? {};
}

// Set or clear the private note on one day. No token (demo mode) -> no-op, so
// the caller can still apply the change locally for the demo experience.
export async function setDayNote(date: string, note: string | null): Promise<void> {
  const token = await getToken();
  if (!token) return;
  const res = await fetch(`${BASE_URL}/api/calendar/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Token': token },
    body: JSON.stringify({ date, note }),
  });
  if (!res.ok) throw new Error(`${res.status} on /api/calendar/note`);
}
