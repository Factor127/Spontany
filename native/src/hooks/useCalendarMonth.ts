import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '../api/session';
import { getCalendar, getConnections, getMe, ApiDay } from '../api/client';
import { buildMonth, dateStr } from '../calendar/month';
import { buildDemoMonth } from '../data/demoMonth';
import { buildPatternMonth } from '../custody/pattern';
import { usePrefs } from '../prefs/PrefsContext';
import {
  getStoredEvent,
  getStoredNote,
  getStoredOwnership,
  setStoredEvent,
  setStoredNote,
  setStoredOwnership,
} from '../mock/store';
import { Day, DayEvent, Ownership } from '../types';

export type Source = 'live' | 'demo';

interface MonthState {
  weeks: (Day | null)[][];
  loading: boolean;
  error?: string;
  source: Source;
}

export interface MonthResult extends MonthState {
  applyNote: (dayNum: number, note: string | null) => void;
  applyEvent: (dayNum: number, event: DayEvent | undefined) => void;
  applyEventAt: (iso: string, event: DayEvent | undefined) => void;
  applyOwnership: (dayNum: number, ownership: Ownership | undefined) => void;
}

// Overlay user edits (custody overrides, events, notes — kept in the mock store,
// keyed by full date) onto the freshly built month. Also gates overlap on the
// partner connection: with no connected partner there are no both-free days.
function applyStore(base: (Day | null)[][], year: number, month: number, connected: boolean): (Day | null)[][] {
  const now = new Date();
  const ty = now.getFullYear();
  const tm = now.getMonth();
  const td = now.getDate();
  return base.map((week) =>
    week.map((d) => {
      if (!d) return d;
      const iso = dateStr(year, month, d.date);
      const own = getStoredOwnership(iso);
      const ev = getStoredEvent(iso);
      const note = getStoredNote(iso);
      const ownership = own !== undefined ? own : d.ownership;
      const baseBoth = own !== undefined ? ownership === 'free' && !!d.partnerFree : !!d.bothFree;
      return {
        ...d,
        ownership,
        bothFree: connected && baseBoth,
        event: ev !== undefined ? ev : d.event,
        note: note !== undefined ? note : d.note,
        isToday: year === ty && month === tm && d.date === td,
      };
    }),
  );
}

// Loads the given month: live backend when authed (own calendar + co-parent's,
// overlap computed locally), otherwise a generated demo month. User edits are
// overlaid from the store either way.
export function useCalendarMonth(year: number, month: number): MonthResult {
  const { pattern, partner } = usePrefs();
  const connected = partner?.status === 'connected';
  const [state, setState] = useState<MonthState>({ weeks: [], loading: true, source: 'demo' });
  const baseRef = useRef<(Day | null)[][]>([]);

  const recompute = useCallback(() => {
    setState((prev) => ({ ...prev, weeks: applyStore(baseRef.current, year, month, connected) }));
  }, [year, month, connected]);

  const applyNote = useCallback(
    (dayNum: number, note: string | null) => {
      setStoredNote(dateStr(year, month, dayNum), note);
      recompute();
    },
    [year, month, recompute],
  );

  const applyEvent = useCallback(
    (dayNum: number, event: DayEvent | undefined) => {
      setStoredEvent(dateStr(year, month, dayNum), event);
      recompute();
    },
    [year, month, recompute],
  );

  const applyOwnership = useCallback(
    (dayNum: number, ownership: Ownership | undefined) => {
      setStoredOwnership(dateStr(year, month, dayNum), ownership);
      recompute();
    },
    [year, month, recompute],
  );

  // Place an event on an explicit ISO date (may be in another month — the caller
  // navigates the cursor there; recompute covers the current-month case).
  const applyEventAt = useCallback(
    (iso: string, event: DayEvent | undefined) => {
      setStoredEvent(iso, event);
      recompute();
    },
    [recompute],
  );

  useEffect(() => {
    let alive = true;

    const settle = (base: (Day | null)[][], source: Source, error?: string) => {
      baseRef.current = base;
      if (alive) setState({ weeks: applyStore(base, year, month, connected), loading: false, source, error });
    };

    // Demo base reflects the user's custody pattern once they've onboarded.
    const demoBase = () => (pattern ? buildPatternMonth(year, month, pattern) : buildDemoMonth(year, month));

    (async () => {
      const token = await getToken();
      if (!token) {
        settle(demoBase(), 'demo');
        return;
      }
      try {
        const me = await getMe();
        const mineResp = await getCalendar(me.id);
        const { connections } = await getConnections();
        const partner = connections.find((c) => c.status === 'approved' && c.relationship_type === 'coparent');
        let partnerDays: ApiDay[] = [];
        if (partner) partnerDays = (await getCalendar(partner.other_user_id)).days;
        settle(buildMonth({ year, month, mine: mineResp.days, partner: partnerDays, me }), 'live');
      } catch (e) {
        settle(demoBase(), 'demo', String((e as Error)?.message ?? e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [year, month, pattern, connected]);

  return { ...state, applyNote, applyEvent, applyEventAt, applyOwnership };
}
