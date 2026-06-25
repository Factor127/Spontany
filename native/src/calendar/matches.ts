import { CustodyPattern, ownershipFor, partnerFreeFor } from '../custody/pattern';
import { demoOwnershipFor } from '../data/demoMonth';

export interface MatchDate {
  iso: string; // YYYY-MM-DD
  label: string; // e.g. "Sat, Jun 21"
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

// The next `count` both-free ("matching") days from `from`, scanning forward
// across months. Uses the user's pattern when set, the demo rule otherwise.
export function upcomingMatches(pattern: CustodyPattern | null, from: Date, count: number): MatchDate[] {
  const out: MatchDate[] = [];
  for (let i = 0; i < 180 && out.length < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const own = pattern ? ownershipFor(pattern, y, m, day) : demoOwnershipFor(y, m, day);
    if (own === 'free' && partnerFreeFor(y, m, day)) {
      out.push({ iso: `${y}-${pad(m + 1)}-${pad(day)}`, label: `${DOW[d.getDay()]}, ${ABBR[m]} ${day}` });
    }
  }
  return out;
}
