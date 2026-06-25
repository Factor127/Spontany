import { Day } from '../types';

// Two ways to express custody, both edited by tapping real day boxes:
//   'weekdays'    — the same weekdays every week (a set of day-of-week)
//   'alternating' — a two-week cycle (14 tappable slots), anchored to a Monday
export type PatternType = 'alternating' | 'weekdays';

export interface CustodyPattern {
  type: PatternType;
  weekdays: number[]; // 'weekdays': dow (0=Sun..6=Sat) that are mine
  fortnight: boolean[]; // 'alternating': 14 slots, Mon-first [wk1 Mon..Sun, wk2 Mon..Sun]
  anchorMondayISO: string; // Monday (YYYY-MM-DD) that slot 0 maps to
}

const DAY_MS = 86400000;
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Monday of the week containing d (weeks start Monday).
export function mondayOf(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // days since Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

export function defaultPattern(today: Date): CustodyPattern {
  return {
    type: 'alternating',
    weekdays: [1, 2, 3, 4, 5],
    // classic split: my full week, then off week
    fortnight: [true, true, true, true, true, true, true, false, false, false, false, false, false, false],
    anchorMondayISO: iso(mondayOf(today)),
  };
}

// Re-anchor an existing pattern to the current week so the editor's "This week"
// row always maps to slots 0–6 (rotating the fortnight if the parity flipped).
export function reanchor(p: CustodyPattern, today: Date): CustodyPattern {
  if (p.type !== 'alternating') return p;
  const [ay, am, ad] = p.anchorMondayISO.split('-').map(Number);
  const anchor = Date.UTC(ay, am - 1, ad);
  const curMon = mondayOf(today);
  const cur = Date.UTC(curMon.getFullYear(), curMon.getMonth(), curMon.getDate());
  const parity = ((Math.floor((cur - anchor) / (7 * DAY_MS)) % 2) + 2) % 2;
  const fortnight = parity === 0 ? p.fortnight : [...p.fortnight.slice(7), ...p.fortnight.slice(0, 7)];
  return { ...p, anchorMondayISO: iso(curMon), fortnight };
}

export function ownershipFor(p: CustodyPattern, y: number, m: number, d: number): Day['ownership'] {
  const dow = new Date(y, m, d).getDay();
  if (p.type === 'weekdays') {
    return p.weekdays.includes(dow) ? 'mine' : 'free';
  }
  const [ay, am, ad] = p.anchorMondayISO.split('-').map(Number);
  const anchor = Date.UTC(ay, am - 1, ad);
  const daysSince = Math.floor((Date.UTC(y, m, d) - anchor) / DAY_MS);
  const weekParity = ((Math.floor(daysSince / 7) % 2) + 2) % 2;
  const slot = weekParity * 7 + ((dow + 6) % 7); // Mon=0..Sun=6
  return p.fortnight[slot] ? 'mine' : 'free';
}

// Independent demo partner (the romantic partner — also a custody parent) so
// genuine both-free overlaps exist: free on weekends and on alternating weekdays.
export function partnerFreeFor(y: number, m: number, d: number): boolean {
  const dow = new Date(y, m, d).getDay();
  if (dow === 0 || dow === 6) return true;
  return Math.floor(Date.UTC(y, m, d) / DAY_MS / 7) % 2 !== 0;
}

export function buildPatternMonth(year: number, month: number, p: CustodyPattern): (Day | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (Day | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ownership = ownershipFor(p, year, month, d);
    const partnerFree = partnerFreeFor(year, month, d);
    cells.push({ date: d, ownership, partnerFree, bothFree: ownership === 'free' && partnerFree });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function summarize(p: CustodyPattern): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (p.type === 'weekdays') {
    const picked = [...p.weekdays].sort((a, b) => a - b).map((d) => names[d]);
    return picked.length ? `Weekly · ${picked.join(', ')}` : 'Weekly · no days set';
  }
  const wk1 = p.fortnight.slice(0, 7).filter(Boolean).length;
  const wk2 = p.fortnight.slice(7, 14).filter(Boolean).length;
  return `Alternating · ${wk1}d / ${wk2}d`;
}
