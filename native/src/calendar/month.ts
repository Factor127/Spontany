import { ApiDay, Me } from '../api/client';
import { Day } from '../types';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
export const dateStr = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

// Mirrors the backend's weekly-digest rule so client-side overlap matches the
// server's: a day is a work block (not free) per the user's work_schedule JSON.
export function isWorkDay(ds: string, wsRaw?: string | null): boolean {
  if (!wsRaw) return false;
  try {
    const ws = JSON.parse(wsRaw);
    const dow = new Date(`${ds}T12:00:00`).getDay();
    if (ws.type === 'standard_weekdays') return dow >= 1 && dow <= 5;
    if (ws.type === 'custom') return (ws.days || []).includes(dow);
    if (ws.type === 'ical') return (ws.dates || []).includes(ds);
  } catch {
    /* malformed schedule — treat as no work block */
  }
  return false;
}

interface BuildArgs {
  year: number;
  month: number; // 0-based
  mine: ApiDay[];
  partner: ApiDay[];
  me?: Me | null;
}

// Produces calendar weeks aligned Monday-first, with null padding cells so the
// grid lines up. Ownership sets the cell; overlap is computed here, never stored
// on the fill. Partner work_schedule isn't exposed by the calendar API, so the
// partner side of overlap uses ownership only — a conservative approximation.
export function buildMonth({ year, month, mine, partner, me }: BuildArgs): (Day | null)[][] {
  const mineMap = new Map(mine.map((d) => [d.date, d]));
  const partMap = new Map(partner.map((d) => [d.date, d]));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday

  const cells: (Day | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);

  for (let dnum = 1; dnum <= daysInMonth; dnum++) {
    const ds = dateStr(year, month, dnum);
    const myRec = mineMap.get(ds);
    const ownership = myRec?.owner === 'self' ? 'mine' : 'free';

    const myFree = (!myRec || myRec.owner === 'coparent') && !isWorkDay(ds, me?.work_schedule);
    const pRec = partMap.get(ds);
    const partnerFree = pRec ? pRec.owner === 'coparent' : false;

    cells.push({
      date: dnum,
      ownership,
      partnerFree,
      bothFree: myFree && partnerFree,
      note: myRec?.note || undefined,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
